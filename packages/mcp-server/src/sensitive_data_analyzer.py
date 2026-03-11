"""Sensitive Data Analyzer using LLM for validation"""

import os
import json
from typing import Dict, Any, Optional
from openai import OpenAI, AzureOpenAI


class SensitiveDataAnalyzer:
    """Analyzes code for sensitive data and validates findings"""

    def __init__(self):
        """Initialize OpenAI or Azure OpenAI client"""
        
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if azure_endpoint:
            self.client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                azure_endpoint=azure_endpoint,
                default_headers={"api-key": os.getenv("AZURE_OPENAI_API_KEY")}
            )
            self.model = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            self.provider = "azure"
        elif openai_key:
            self.client = OpenAI(api_key=openai_key)
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
            self.provider = "openai"
        else:
            # LLM yapılandırması yoksa graceful fallback — servis başlar,
            # ama sensitive data analizi devre dışı kalır
            import warnings
            warnings.warn(
                "SensitiveDataAnalyzer: OpenAI configuration not found. "
                "Sensitive data analysis will be disabled.",
                RuntimeWarning
            )
            self.client = None
            self.model = None
            self.provider = None

    def analyze_sensitive_data_finding(
        self,
        file_path: str,
        file_content: str,
        keyword: str,
        policy: Optional[str] = None,
        context_lines: int = 5,
        max_occurrences: int = 20
    ) -> Dict[str, Any]:
        """Analyze if a keyword finding is a real sensitive data exposure
        
        Args:
            file_path: Path to the file
            file_content: Full content of the file
            keyword: The keyword that was flagged
            policy: Policy name that triggered the finding (e.g., 'Keyword Politikası')
            context_lines: Number of lines to show around each occurrence (default: 5)
            max_occurrences: Maximum number of occurrences to analyze (default: 20)
            
        Returns:
            Analysis result with validation and recommendation
        """
        
        # Find all occurrences with context
        occurrences = self._find_keyword_with_context(file_content, keyword, context_lines)
        total_found = len(occurrences)

        if self.client is None:
            return {
                "is_sensitive": None,
                "confidence": "none",
                "classification": "llm_not_configured",
                "reason": "LLM not configured — sensitive data analysis disabled",
                "total_occurrences": total_found,
                "analyzed_count": 0,
            }
        
        # Limit occurrences for large files to avoid token limits
        if len(occurrences) > max_occurrences:
            occurrences = occurrences[:max_occurrences]
        
        if not occurrences:
            return {
                "is_sensitive": False,
                "confidence": "high",
                "classification": "not_found",
                "reason": f"Keyword '{keyword}' not found in the file",
                "occurrences": [],
                "recommendation": None
            }
        
        # Prepare the prompt for AI analysis
        policy_context = ""
        if policy:
            policy_context = f"""
**Security Policy Context**:
This keyword was flagged by the **"{policy}"** security policy.

**Detailed Policy Rules and Acceptable Exceptions**:

1. **IBAN Politikası**
   - Rule: IBAN numbers should NOT be in code
   - Acceptable: Test data can be whitelisted if explicitly marked as test/dummy data
   - Look for: TR + 24 digits pattern

2. **IP Adres Politikası**
   - Rule: IP addresses should NOT be hardcoded in code
   - Acceptable: Can be managed via parameters/configuration
   - Acceptable: Test data can be whitelisted if explicitly marked as test/dummy data
   - Look for: IPv4 (x.x.x.x) or IPv6 patterns

3. **Kart Politikası**
   - Rule: Credit/debit card numbers should NOT be in code
   - Acceptable: Test data can be whitelisted if explicitly marked as test/dummy data
   - Look for: 16-digit numbers, CVV codes, expiry dates

4. **Keyword Politikası**
   - Rule: General sensitive keywords should NOT be hardcoded
   - Includes: password, api_key, token, secret, credential, auth
   - Acceptable: Variable names, method parameters, configuration keys (WITHOUT VALUES)
   - Acceptable: Comments explaining usage

5. **Metadata Politikası**
   - Rule: Should NOT be in code unless necessary
   - Look for: File paths, system info, internal structure details

6. **PlakaNo Politikası**
   - Rule: Vehicle license plate numbers should NOT be in code
   - Acceptable: Test data can be whitelisted if explicitly marked as test/dummy data

7. **PrivateKey Politikası**
   - Rule: Private keys/certificates should NOT be in code
   - Acceptable: Can be managed via parameters/configuration
   - Look for: RSA, SSH, PEM format keys, BEGIN/END PRIVATE KEY blocks

8. **SunucuAdi Politikası**
   - Rule: Server names/hostnames should NOT be hardcoded
   - Acceptable: Can be managed via parameters/configuration
   - Look for: Server URLs, database connection strings with server names

9. **TCKN Politikası**
   - Rule: Turkish ID numbers (11-digit) should NOT be in code
   - Acceptable: Test data can be whitelisted if explicitly marked as test/dummy data

10. **Other Important Rules**:
    - Bank names should NOT be in code
    - CVV information should NOT be in code
    - Secret information should NOT be in code
    - User credentials (username/password pairs) should NOT be in code
    - KVKK compliance: Personal data addresses should NOT be stored unless whitelisted
    - Customer/Personnel account information should NOT be addressable unless whitelisted
    - Personnel database info should NOT be addressable unless whitelisted
    - Branch information should NOT be in code (can be managed via parameters)
    - Password information should NOT be in code (can be managed via parameters)
    - PIN information should NOT be in code (can be managed via parameters)
    - Encryption keys should NOT be in code (can be managed via parameters)

**IMPORTANT EVALUATION CRITERIA**:
- ✅ **FALSE POSITIVE if**: Variable/parameter declaration without value, reading from config/environment, test placeholder text, comments/documentation
- ✅ **ACCEPTABLE if**: Managed via parameters, configuration files, environment variables, or explicitly marked test data
- ❌ **SENSITIVE if**: Hardcoded actual values (real passwords, keys, IDs, server names with credentials)
- ⚠️ **WHITELIST CANDIDATE if**: Test data that looks real but is marked as test/dummy/example

Consider these rules when evaluating severity and classification.
"""

        system_prompt = f"""You are a cybersecurity expert specializing in sensitive data detection and false positive analysis. 
Your task is to determine if flagged keywords in code represent REAL sensitive data exposures or FALSE POSITIVES.

{policy_context}

You must analyze:
1. **Context**: Where and how the keyword is used
2. **Value Analysis**: Is there an actual sensitive value (password, key, token) or just a reference?
3. **Code Purpose**: Is this production code, test code, example, or configuration?
4. **Risk Level**: If real, what's the severity?

REAL SENSITIVE DATA examples:
- Hardcoded passwords: password = "MySecr3tP@ss"
- API keys in code: apiKey = "sk-1234567890abcdef"
- Database connection strings with credentials: "Server=...;Password=actual_password;"
- Private keys/certificates embedded in code
- OAuth tokens hardcoded: token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
- AWS keys, Azure keys with actual values

FALSE POSITIVES examples:
- Variable names: string password; // Declaration only
- Method parameters: void Login(string username, string password)
- Comments explaining password policy: // Password must be 8 chars
- Configuration keys: config.GetValue("Password") // Reading from config
- Placeholder values: password = "YOUR_PASSWORD_HERE"
- Test dummy data: password = "test123" in unit tests
- Empty/null assignments: string password = "";
- Documentation: "Enter your password below"
- UI labels: <Label>Password:</Label>
- Example code in comments: // Example: password="secret"

Return JSON with:
{{
  "is_sensitive": boolean,  // true if real sensitive data, false if false positive
  "confidence": "high|medium|low",  // confidence level in the assessment
  "classification": "hardcoded_secret|config_reference|variable_declaration|comment|placeholder|test_data|documentation|not_found",
  "reason": "Detailed explanation of why this is/isn't sensitive data",
  "severity": "critical|high|medium|low|none",  // If is_sensitive=true
  "occurrences": [
    {{
      "line_number": int,
      "context": "code snippet",
      "is_sensitive": boolean,
      "explanation": "why this specific occurrence is/isn't sensitive"
    }}
  ],
  "recommendation": "If sensitive: specific remediation steps. If false positive: explanation of safe usage."
}}"""

        user_prompt = f"""Analyze this file for sensitive data exposure.

**File Path**: {file_path}
**Flagged Keyword**: "{keyword}"
{f'**Security Policy**: {policy}' if policy else ''}
**Total Occurrences Found**: {total_found}
**Analyzing**: {len(occurrences)} occurrence(s) {f'(limited from {total_found} for performance)' if total_found > len(occurrences) else ''}

**Occurrences with Context**:
"""
        
        for i, occ in enumerate(occurrences, 1):
            user_prompt += f"\n--- Occurrence {i} (Line {occ['line_number']}) ---\n"
            user_prompt += f"```\n{occ['context']}\n```\n"
        
        user_prompt += """
**Your Task**:
1. For EACH occurrence, determine if it contains REAL sensitive data or is a FALSE POSITIVE
2. Provide overall assessment
3. If sensitive data found, provide SPECIFIC remediation steps
4. If false positive, explain why it's safe

Be thorough and precise. Security depends on your accuracy."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Low temperature for consistent analysis
                max_tokens=3000,  # Increased for longer responses
                timeout=120,  # 2 minutes timeout for large files
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Add metadata
            result["file_path"] = file_path
            result["keyword"] = keyword
            result["policy"] = policy
            result["total_occurrences"] = total_found
            result["analyzed_occurrences"] = len(occurrences)
            if total_found > len(occurrences):
                result["note"] = f"Analyzed first {len(occurrences)} of {total_found} occurrences due to size limits"
            
            # Enhance recommendation based on severity
            if result.get("is_sensitive"):
                result["recommendation"] = self._generate_remediation(
                    file_path, 
                    keyword, 
                    result.get("severity", "high"),
                    result.get("recommendation", "")
                )
            
            return result
            
        except Exception as e:
            return {
                "error": str(e),
                "file_path": file_path,
                "keyword": keyword,
                "is_sensitive": None,
                "confidence": "none",
                "reason": f"Analysis failed: {str(e)}",
                "occurrences": occurrences
            }

    def _find_keyword_with_context(
        self, 
        content: str, 
        keyword: str, 
        context_lines: int = 10
    ) -> list:
        """Find keyword occurrences with surrounding context"""
        
        lines = content.split('\n')
        occurrences = []
        
        # Search case-insensitive
        keyword_lower = keyword.lower()
        
        for i, line in enumerate(lines):
            if keyword_lower in line.lower():
                # Calculate context range
                start = max(0, i - context_lines)
                end = min(len(lines), i + context_lines + 1)
                
                # Get context
                context_lines_list = lines[start:end]
                
                # Mark the actual line
                for j, ctx_line in enumerate(context_lines_list):
                    if start + j == i:
                        context_lines_list[j] = f">>> {ctx_line}  <<<  [FLAGGED LINE]"
                
                occurrences.append({
                    "line_number": i + 1,
                    "line_content": line,
                    "context": '\n'.join(context_lines_list),
                    "start_line": start + 1,
                    "end_line": end
                })
        
        return occurrences

    def _generate_remediation(
        self, 
        file_path: str, 
        keyword: str, 
        severity: str,
        base_recommendation: str
    ) -> str:
        """Generate detailed remediation steps"""
        
        file_ext = file_path.split('.')[-1].lower()
        
        remediation = f"**IMMEDIATE ACTION REQUIRED - {severity.upper()} SEVERITY**\n\n"
        remediation += f"{base_recommendation}\n\n"
        remediation += "**Remediation Steps:**\n\n"
        
        if any(x in keyword.lower() for x in ['password', 'pwd', 'pass']):
            remediation += """1. **Remove hardcoded password immediately**
   - Delete the sensitive value from code
   - Commit the change to overwrite history
   
2. **Move to secure storage**:
   - Use Azure Key Vault for production secrets
   - Use environment variables for development
   - Use appsettings.json with User Secrets in .NET
   
3. **Update application code**:
   ```csharp
   // Instead of: var password = "hardcoded";
   // Use:
   var password = Configuration["Database:Password"];
   // Or: var password = Environment.GetEnvironmentVariable("DB_PASSWORD");
   ```

4. **Rotate the compromised credential**:
   - Change the password on the target system
   - Update it in secure storage
   - Test the application
   
5. **Add to .gitignore** if applicable"""

        elif any(x in keyword.lower() for x in ['apikey', 'api_key', 'token', 'secret']):
            remediation += """1. **Revoke the exposed key/token immediately**
   - Access the service provider (Azure, AWS, etc.)
   - Revoke/delete the compromised key
   
2. **Generate new credentials**:
   - Create new API key/token
   - Store in Azure Key Vault or equivalent
   
3. **Update code to read from secure storage**:
   ```csharp
   // Instead of: var apiKey = "sk-1234...";
   // Use:
   var apiKey = await keyVaultClient.GetSecretAsync("ApiKey");
   ```

4. **Implement rotation policy**:
   - Set up automatic key rotation
   - Document the rotation process
   
5. **Scan git history**:
   - Check if key exists in previous commits
   - Use BFG Repo-Cleaner if needed"""

        elif any(x in keyword.lower() for x in ['connectionstring', 'connection_string', 'connstr']):
            remediation += """1. **Remove connection string from code**
   - Delete hardcoded connection string
   
2. **Move to configuration**:
   - Add to appsettings.json (without secrets)
   - Use Azure Key Vault for connection strings
   - Or use Managed Identity for Azure SQL
   
3. **Update code**:
   ```csharp
   // Use:
   var connString = Configuration.GetConnectionString("DefaultConnection");
   ```

4. **Enable Managed Identity** (recommended):
   - Use Azure Managed Identity for authentication
   - No credentials needed in connection string
   
5. **Rotate database credentials** if exposed"""

        else:
            remediation += f"""1. **Remove hardcoded sensitive data**
   - Identify all occurrences of '{keyword}'
   - Remove sensitive values
   
2. **Use secure storage**:
   - Azure Key Vault for production
   - Environment variables for development
   - Configuration files with secrets management
   
3. **Update code to read from secure storage**
   
4. **Rotate/revoke compromised credentials**
   
5. **Review git history and clean if needed**"""

        remediation += "\n\n**Prevention**:\n"
        remediation += "- Add pre-commit hooks to detect secrets\n"
        remediation += "- Use tools like git-secrets, trufflehog\n"
        remediation += "- Implement code review process\n"
        remediation += "- Enable Azure DevOps secret scanning\n"
        
        return remediation
