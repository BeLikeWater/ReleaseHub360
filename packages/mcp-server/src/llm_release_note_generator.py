"""LLM-powered release note generator"""

from typing import List, Dict, Any
from .models import PullRequest, WorkItem, CodeAnalysis
from .llm_code_analyzer import LLMCodeAnalyzer
from .azure_client import AzureDevOpsClient


class LLMReleaseNoteGenerator:
    """Generates release notes using LLM analysis of actual code changes"""

    def __init__(self, azure_client: AzureDevOpsClient):
        self.azure_client = azure_client
        try:
            self.llm_analyzer = LLMCodeAnalyzer()
            self.llm_enabled = True
        except ValueError as e:
            print(f"⚠️  LLM not configured: {e}")
            print("⚠️  Falling back to pattern-based analysis")
            self.llm_enabled = False

    async def analyze_prs_with_llm(
        self,
        pull_requests: List[PullRequest],
        code_analyses: List[CodeAnalysis]
    ) -> List[Dict[str, Any]]:
        """Analyze PRs using LLM
        
        Args:
            pull_requests: List of pull requests
            code_analyses: List of code analyses with file changes
            
        Returns:
            List of LLM-powered analyses
        """
        
        if not self.llm_enabled:
            return []
        
        llm_analyses = []
        
        for pr, analysis in zip(pull_requests, code_analyses):
            try:
                # Get actual diffs for this PR
                diffs = await self.azure_client.get_pr_diffs(
                    pr.repository_id or pr.repository,
                    pr.pull_request_id
                )
                
                # Analyze with LLM
                llm_analysis = self.llm_analyzer.analyze_pr_changes(
                    pr,
                    analysis.file_changes,
                    diffs
                )
                llm_analyses.append(llm_analysis)
                
            except Exception as e:
                print(f"Error analyzing PR {pr.pull_request_id} with LLM: {e}")
                continue
        
        return llm_analyses

    def generate_technical_release_notes(
        self,
        pbi: WorkItem,
        pull_requests: List[PullRequest],
        llm_analyses: List[Dict[str, Any]]
    ) -> str:
        """Generate technical release notes from LLM analyses"""
        
        if not llm_analyses:
            return self._generate_fallback_technical_notes(pbi, pull_requests)
        
        notes = f"""# Technical Release Notes

**Work Item**: {pbi.title.split('-')[0].strip() if '-' in pbi.title else pbi.title}
**Type**: {pbi.work_item_type}

---

"""
        
        # Group changes by type
        features = [a for a in llm_analyses if a.get("overall_type") == "feature"]
        bugfixes = [a for a in llm_analyses if a.get("overall_type") == "bugfix"]
        performance = [a for a in llm_analyses if a.get("overall_type") == "performance"]
        refactors = [a for a in llm_analyses if a.get("overall_type") == "refactor"]
        others = [a for a in llm_analyses if a.get("overall_type") not in ["feature", "bugfix", "performance", "refactor"]]
        
        # New Features
        if features:
            notes += "## ✨ New Features\n\n"
            for analysis in features:
                notes += f"**PR #{analysis['pr_id']}: {analysis['pr_title']}**\n"
                notes += f"- {analysis['summary']}\n"
                if analysis.get('key_changes'):
                    for change in analysis['key_changes'][:3]:
                        notes += f"  - {change}\n"
                notes += "\n"
        
        # Bug Fixes
        if bugfixes:
            notes += "## 🐛 Bug Fixes\n\n"
            for analysis in bugfixes:
                notes += f"**PR #{analysis['pr_id']}: {analysis['pr_title']}**\n"
                notes += f"- {analysis['summary']}\n"
                if analysis.get('key_changes'):
                    for change in analysis['key_changes'][:3]:
                        notes += f"  - {change}\n"
                notes += "\n"
        
        # Performance Improvements
        if performance:
            notes += "## ⚡ Performance Improvements\n\n"
            for analysis in performance:
                notes += f"**PR #{analysis['pr_id']}: {analysis['pr_title']}**\n"
                notes += f"- {analysis['summary']}\n"
                if analysis.get('technical_highlights'):
                    notes += f"- {analysis['technical_highlights']}\n"
                notes += "\n"
        
        # Code Refactoring
        if refactors:
            notes += "## 🔨 Code Refactoring\n\n"
            for analysis in refactors:
                notes += f"**PR #{analysis['pr_id']}**: {analysis['summary']}\n"
        
        # Other Changes
        if others:
            notes += "## 🔧 Other Changes\n\n"
            for analysis in others:
                notes += f"**PR #{analysis['pr_id']}**: {analysis['summary']}\n"
        
        # Summary
        notes += "\n## 📊 Summary\n\n"
        notes += f"- **Total Pull Requests**: {len(pull_requests)}\n"
        notes += f"- **Features**: {len(features)}\n"
        notes += f"- **Bug Fixes**: {len(bugfixes)}\n"
        notes += f"- **Performance**: {len(performance)}\n"
        
        # File changes
        total_files = sum(len(a.get('file_analyses', [])) for a in llm_analyses)
        if total_files > 0:
            notes += f"- **Files Analyzed**: {total_files}\n"
        
        return notes

    def generate_business_release_notes(
        self,
        pbi: WorkItem,
        pull_requests: List[PullRequest],
        llm_analyses: List[Dict[str, Any]]
    ) -> str:
        """Generate business-focused release notes from LLM analyses"""
        
        if not llm_analyses:
            return self._generate_fallback_business_notes(pbi, pull_requests)
        
        notes = f"""# Release Notes

**Feature**: {pbi.title.split('-')[0].strip() if '-' in pbi.title else pbi.title}
**Status**: {pbi.state}

---

"""
        
        # What Changed
        notes += "## 💡 What Changed\n\n"
        for analysis in llm_analyses:
            if analysis.get('summary'):
                notes += f"**{analysis['summary']}**\n"
                if analysis.get('key_changes'):
                    for change in analysis['key_changes']:
                        notes += f"- {change}\n"
                notes += "\n"
        
        # Business Impact
        notes += "## 🎯 Business Impact\n\n"
        for analysis in llm_analyses:
            if analysis.get('business_impact'):
                notes += f"- {analysis['business_impact']}\n"
        
        if not any(a.get('business_impact') for a in llm_analyses):
            notes += "- Enhanced application functionality and user experience\n"
            notes += "- Improved system reliability and performance\n"
        
        # Delivery Status
        completed_prs = [pr for pr in pull_requests if pr.status.lower() == "completed"]
        notes += "\n## ✅ Delivery Status\n\n"
        notes += f"- **Completed**: {len(completed_prs)} out of {len(pull_requests)} pull requests\n"
        
        if len(completed_prs) < len(pull_requests):
            notes += f"- **In Progress**: {len(pull_requests) - len(completed_prs)} pull requests\n"
        
        return notes

    def _generate_fallback_technical_notes(self, pbi: WorkItem, pull_requests: List[PullRequest]) -> str:
        """Fallback when LLM is not available"""
        return f"""# Technical Release Notes

**Work Item**: {pbi.title}
**Type**: {pbi.work_item_type}

---

## ⚠️ LLM Analysis Not Available

Configure OpenAI or Azure OpenAI to get detailed code analysis.

## 📋 Pull Requests

{chr(10).join([f"- PR #{pr.pull_request_id}: {pr.title}" for pr in pull_requests])}

**Total**: {len(pull_requests)} pull requests
"""

    def _generate_fallback_business_notes(self, pbi: WorkItem, pull_requests: List[PullRequest]) -> str:
        """Fallback when LLM is not available"""
        completed = len([pr for pr in pull_requests if pr.status.lower() == "completed"])
        
        return f"""# Release Notes

**Feature**: {pbi.title}
**Status**: {pbi.state}

---

## ⚠️ LLM Analysis Not Available

Configure OpenAI or Azure OpenAI to get detailed business impact analysis.

## ✅ Delivery Status

- **Completed**: {completed} out of {len(pull_requests)} pull requests
"""
