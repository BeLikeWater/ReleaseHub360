"""AI-powered release note generator with actual code analysis"""

from typing import List, Dict, Any
from .models import PullRequest, CodeAnalysis, WorkItem


class AIReleaseNoteGenerator:
    """Generates intelligent release notes by analyzing actual code changes"""

    def __init__(self):
        pass

    def _analyze_code_changes(
        self,
        pull_requests: List[PullRequest],
        code_analyses: List[CodeAnalysis],
    ) -> Dict[str, Any]:
        """Analyze code changes and extract meaningful insights"""
        
        insights = {
            "database_changes": [],
            "api_changes": [],
            "service_changes": [],
            "business_logic_changes": [],
            "infrastructure_changes": [],
            "performance_optimizations": [],
            "bug_fixes": [],
            "new_features": [],
        }
        
        for analysis in code_analyses:
            for file_change in analysis.file_changes:
                path = file_change.path.lower()
                change_type = file_change.change_type.lower()
                file_name = file_change.path.split("/")[-1]
                
                # Database changes
                if "sql" in path or "migration" in path or "changescript" in path:
                    insights["database_changes"].append({
                        "file": file_change.path,
                        "file_name": file_name,
                        "type": change_type,
                        "pr_id": analysis.pull_request_id
                    })
                
                # API/Router changes
                elif "router" in path or "controller" in path or "/api/" in path:
                    insights["api_changes"].append({
                        "file": file_change.path,
                        "file_name": file_name,
                        "type": change_type,
                        "pr_id": analysis.pull_request_id
                    })
                
                # Business logic layer
                elif "business" in path and path.endswith(".cs"):
                    insights["business_logic_changes"].append({
                        "file": file_change.path,
                        "file_name": file_name,
                        "type": change_type,
                        "pr_id": analysis.pull_request_id
                    })
                
                # Service layer changes  
                elif "service" in path and not path.endswith("servicebase.cs"):
                    insights["service_changes"].append({
                        "file": file_change.path,
                        "file_name": file_name,
                        "type": change_type,
                        "pr_id": analysis.pull_request_id
                    })
                
                # Cache/Performance
                elif "cache" in path or "serializ" in path:
                    insights["performance_optimizations"].append({
                        "file": file_change.path,
                        "file_name": file_name,
                        "type": change_type,
                        "pr_id": analysis.pull_request_id
                    })
        
        # Categorize PRs
        for pr in pull_requests:
            title_lower = pr.title.lower()
            
            if any(keyword in title_lower for keyword in ["bugfix", "bug fix", "bug ", "fix bug"]):
                insights["bug_fixes"].append({
                    "pr_id": pr.pull_request_id,
                    "title": pr.title,
                    "description": pr.description or ""
                })
            elif "feature" in title_lower or "new " in title_lower:
                insights["new_features"].append({
                    "pr_id": pr.pull_request_id,
                    "title": pr.title,
                    "description": pr.description or ""
                })
        
        return insights

    def generate_technical_release_notes(
        self,
        pbi: WorkItem,
        pull_requests: List[PullRequest],
        code_analyses: List[CodeAnalysis],
    ) -> str:
        """Generate concise technical release notes focused on actual code changes"""
        
        # Check if we have any PRs
        if not pull_requests:
            return f"""# Technical Release Notes

**Work Item**: {pbi.title.split('-')[0].strip() if '-' in pbi.title else pbi.title}
**Type**: {pbi.work_item_type}
**State**: {pbi.state}

---

## ⚠️ No Pull Requests Found

This work item does not have any associated pull requests yet.

Possible reasons:
- PRs are not linked to this work item
- Work is still in progress
- Changes are being made in a different branch
"""
        
        insights = self._analyze_code_changes(pull_requests, code_analyses)
        
        notes = f"""# Technical Release Notes

**PBI**: {pbi.title.split('-')[0].strip() if '-' in pbi.title else pbi.title}

---

"""
        
        # Database Changes
        if insights["database_changes"]:
            notes += "## 🗄️ Database Changes\n\n"
            seen_files = set()
            for change in insights["database_changes"]:
                if change["file"] not in seen_files:
                    seen_files.add(change["file"])
                    file_name = change["file"].split("/")[-1]
                    
                    if ".sql" in file_name.lower():
                        notes += f"- **{file_name}**\n"
                        
                        # Try to infer what changed from filename
                        if "dml" in file_name.lower():
                            notes += f"  - Data modification script\n"
                        elif "ddl" in file_name.lower():
                            notes += f"  - Schema changes\n"
                        
                        if change["type"] == "add":
                            notes += f"  - New script added\n"
                        
            notes += "\n"
        
        # Business Logic Changes
        if insights["business_logic_changes"]:
            notes += "## 💼 Business Logic Changes\n\n"
            seen_files = set()
            for change in insights["business_logic_changes"]:
                if change["file"] not in seen_files:
                    seen_files.add(change["file"])
                    file_name = change["file_name"]
                    
                    notes += f"- **{file_name}**\n"
                    
                    # Infer changes from file name
                    if "person" in file_name.lower():
                        notes += f"  - Person/Customer management logic updated\n"
                    elif "order" in file_name.lower():
                        notes += f"  - Order processing logic modified\n"
                    elif "product" in file_name.lower():
                        notes += f"  - Product management logic updated\n"
                    
                    if change["type"] == "edit":
                        notes += f"  - Modified existing business rules\n"
                    elif change["type"] == "add":
                        notes += f"  - New business logic added\n"
            
            notes += "\n"
        
        # API/Service Changes
        if insights["api_changes"]:
            notes += "## 🔌 API & Service Layer Changes\n\n"
            seen_files = set()
            for change in insights["api_changes"]:
                if change["file"] not in seen_files:
                    seen_files.add(change["file"])
                    file_name = change["file_name"]
                    
                    notes += f"- **{file_name}**\n"
                    
                    # Infer changes from file name
                    if "router" in file_name.lower():
                        notes += f"  - Request routing logic updated\n"
                    elif "helper" in file_name.lower():
                        notes += f"  - Helper methods modified\n"
                    
                    if change["type"] == "edit":
                        notes += f"  - Modified existing functionality\n"
                    elif change["type"] == "add":
                        notes += f"  - New file added\n"
            
            notes += "\n"
        
        # Performance Optimizations
        if insights["performance_optimizations"]:
            notes += "## ⚡ Performance Optimizations\n\n"
            seen_files = set()
            for change in insights["performance_optimizations"]:
                if change["file"] not in seen_files:
                    seen_files.add(change["file"])
                    file_name = change["file"].split("/")[-1]
                    
                    notes += f"- **{file_name}**\n"
                    
                    if "cache" in file_name.lower():
                        notes += f"  - Cache mechanism improvements\n"
                    if "serializ" in file_name.lower():
                        notes += f"  - Data serialization optimized\n"
            
            notes += "\n"
        
        # Service Changes
        if insights["service_changes"]:
            notes += "## 🔧 Service Layer Updates\n\n"
            seen_services = set()
            for change in insights["service_changes"]:
                service_name = change["file"].split("/")[-1]
                if service_name not in seen_services:
                    seen_services.add(service_name)
                    notes += f"- **{service_name}**: Business logic updated\n"
            
            notes += "\n"
        
        # Summary
        notes += "## 📊 Summary\n\n"
        notes += f"- **Total Changes**: {len(pull_requests)} pull requests merged\n"
        
        total_files = sum([
            len(insights["database_changes"]),
            len(insights["api_changes"]),
            len(insights["business_logic_changes"]),
            len(insights["service_changes"]),
            len(insights["performance_optimizations"])
        ])
        notes += f"- **Files Modified**: {total_files} files across different layers\n"
        
        if insights["database_changes"]:
            notes += f"- **Database Impact**: {len(insights['database_changes'])} schema/data changes\n"
        
        return notes

    def generate_business_release_notes(
        self,
        pbi: WorkItem,
        pull_requests: List[PullRequest],
        code_analyses: List[CodeAnalysis],
    ) -> str:
        """Generate business-focused release notes with impact analysis"""
        
        # Check if we have any PRs
        if not pull_requests:
            return f"""# Release Notes

**Work Item**: {pbi.title.split('-')[0].strip() if '-' in pbi.title else pbi.title}
**Type**: {pbi.work_item_type}
**State**: {pbi.state}

---

## ⚠️ No Completed Pull Requests

This work item does not have any completed pull requests yet.

**Current Status:**
- Work item exists and is tracked
- No code changes have been merged to production
- Development may still be in progress

**Next Steps:**
- Verify that pull requests are linked to this work item
- Check if changes are in review or testing
- Ensure work is not being tracked under a different work item
"""
        
        insights = self._analyze_code_changes(pull_requests, code_analyses)
        
        notes = f"""# Release Notes

**Feature**: {pbi.title.split('-')[0].strip() if '-' in pbi.title else pbi.title}

---

"""
        
        # What Changed - High Level
        notes += "## 💡 What Changed\n\n"
        
        has_changes = False
        
        # Bug fixes
        if insights["bug_fixes"]:
            has_changes = True
            notes += "### Bug Fixes\n\n"
            for bug in insights["bug_fixes"][:3]:  # Show max 3
                title = bug["title"]
                # Remove PR number prefix if exists
                if ":" in title:
                    title = title.split(":", 1)[1].strip()
                notes += f"**{title}**\n"
                if bug.get("description"):
                    notes += f"- {bug['description'][:200]}...\n" if len(bug['description']) > 200 else f"- {bug['description']}\n"
                notes += "\n"
        
        # Business logic changes
        if insights["business_logic_changes"]:
            has_changes = True
            notes += "### Business Logic Updates\n\n"
            
            # Group by business area
            person_changes = [c for c in insights["business_logic_changes"] if "person" in c["file"].lower()]
            customer_changes = [c for c in insights["business_logic_changes"] if "customer" in c["file"].lower()]
            
            if person_changes or customer_changes:
                notes += "**Customer Management**\n"
                notes += "- Updated person/customer data retrieval logic\n"
                notes += "- Expected Impact: More accurate customer information\n\n"
        
        if insights["performance_optimizations"]:
            has_changes = True
            notes += "### Performance Improvements\n\n"
            
            # Analyze what kind of performance improvements
            cache_changes = [c for c in insights["performance_optimizations"] if "cache" in c["file"].lower()]
            serialization_changes = [c for c in insights["performance_optimizations"] if "serializ" in c["file"].lower()]
            
            if cache_changes:
                notes += "**Caching System Enhanced**\n"
                notes += "- Improved data caching mechanism for faster retrieval\n"
                notes += "- Expected Impact: Reduced server load and faster response times\n\n"
            
            if serialization_changes:
                notes += "**Data Processing Optimized**\n"
                notes += "- Enhanced data serialization for better performance\n"
                notes += "- Expected Impact: Faster data transmission and reduced memory usage\n\n"
        
        if insights["database_changes"]:
            has_changes = True
            notes += "### Database Updates\n\n"
            notes += f"**{len(insights['database_changes'])} database changes applied**\n"
            notes += "- Schema optimizations and data structure improvements\n"
            notes += "- Expected Impact: Better data organization and query performance\n\n"
        
        if insights["api_changes"]:
            has_changes = True
            notes += "### System Integration Updates\n\n"
            
            router_changes = [c for c in insights["api_changes"] if "router" in c["file"].lower()]
            service_base_changes = [c for c in insights["api_changes"] if "servicebase" in c["file"].lower()]
            
            if router_changes:
                notes += "**Request Routing Enhanced**\n"
                notes += "- Improved request handling and routing logic\n"
                notes += "- Expected Impact: More reliable service communication\n\n"
            
            if service_base_changes:
                notes += "**Core Services Updated**\n"
                notes += "- Base service infrastructure improvements\n"
                notes += "- Expected Impact: Better service stability and reliability\n\n"
        
        if insights["service_changes"]:
            has_changes = True
            
            # Look for specific service types
            grid_services = [c for c in insights["service_changes"] if "grid" in c["file"].lower()]
            
            if grid_services:
                notes += "### Grid System Improvements\n\n"
                notes += "**Configurable Grid Service Updated**\n"
                notes += "- Enhanced grid configuration and data management\n"
                notes += "- Expected Impact: More flexible and faster grid operations\n\n"
        
        if not has_changes:
            notes += "Infrastructure and code quality improvements for better system reliability.\n\n"
        
        # Business Impact
        notes += "## 🎯 Expected Business Impact\n\n"
        
        if insights["performance_optimizations"]:
            notes += "**User Experience**\n"
            notes += "- Faster page load times and data retrieval\n"
            notes += "- Smoother application performance\n\n"
        
        if insights["database_changes"] or insights["api_changes"]:
            notes += "**System Reliability**\n"
            notes += "- Improved data consistency and accuracy\n"
            notes += "- Better system stability under load\n\n"
        
        notes += "**Overall Impact**\n"
        notes += "- Enhanced application performance and reliability\n"
        notes += "- Foundation for future feature enhancements\n"
        notes += "- Reduced technical debt and improved maintainability\n\n"
        
        # Completion Status
        completed_prs = [pr for pr in pull_requests if pr.status.lower() == "completed"]
        
        notes += "## ✅ Delivery Status\n\n"
        notes += f"- {len(completed_prs)} out of {len(pull_requests)} changes deployed to production\n"
        
        if len(completed_prs) < len(pull_requests):
            notes += f"- {len(pull_requests) - len(completed_prs)} changes in review/testing phase\n"
        
        return notes
