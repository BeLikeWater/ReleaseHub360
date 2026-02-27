"""Release note generator using AI analysis"""

from typing import List, Dict, Any
from .models import PullRequest, CodeAnalysis, WorkItem


class ReleaseNoteGenerator:
    """Generates technical and business release notes from code changes"""

    def __init__(self):
        pass

    def generate_technical_release_notes(
        self,
        pbi: WorkItem,
        tasks: List[WorkItem],
        pull_requests: List[PullRequest],
        code_analyses: List[CodeAnalysis],
        aggregate_stats: Dict[str, Any],
    ) -> str:
        """Generate technical release notes for developers"""

        # Group changes by category
        infrastructure_changes = []
        performance_changes = []
        bug_fixes = []
        feature_changes = []

        for pr in pull_requests:
            title_lower = pr.title.lower()
            if "bugfix" in title_lower or "bug fix" in title_lower:
                bug_fixes.append(pr)
            elif "performance" in title_lower or "optimization" in title_lower:
                performance_changes.append(pr)
            elif "infrastructure" in title_lower or "refactor" in title_lower:
                infrastructure_changes.append(pr)
            else:
                feature_changes.append(pr)

        # Build technical notes
        notes = f"""# Technical Release Notes

## Overview
**PBI**: {pbi.title}
**Status**: {pbi.state}
**Total Tasks**: {len(tasks)}
**Pull Requests**: {len(pull_requests)}

## Code Statistics
- **Files Modified**: {aggregate_stats['total_files_changed']}
- **Unique Files Affected**: {aggregate_stats['unique_files_affected']}
- **Total Lines Added**: {aggregate_stats['total_additions']}
- **Total Lines Deleted**: {aggregate_stats['total_deletions']}
- **Net Change**: {aggregate_stats['net_change']} lines

---

## Changes by Category

"""

        if performance_changes:
            notes += "### ⚡ Performance Improvements\n\n"
            for pr in performance_changes:
                notes += f"- **PR #{pr.pull_request_id}**: {pr.title}\n"
                notes += f"  - Branch: `{pr.source_branch}` → `{pr.target_branch}`\n"
                notes += f"  - Status: {pr.status}\n"
                
                # Find related analysis
                for analysis in code_analyses:
                    if analysis.pull_request_id == pr.pull_request_id:
                        notes += f"  - Files changed: {analysis.total_files_changed}\n"
                        if analysis.file_changes:
                            notes += "  - Modified files:\n"
                            for fc in analysis.file_changes[:5]:
                                notes += f"    - `{fc.path}` ({fc.change_type})\n"
                        break
                notes += "\n"

        if feature_changes:
            notes += "### ✨ New Features\n\n"
            for pr in feature_changes:
                notes += f"- **PR #{pr.pull_request_id}**: {pr.title}\n"
                notes += f"  - Branch: `{pr.source_branch}` → `{pr.target_branch}`\n"
                notes += f"  - Status: {pr.status}\n"
                
                for analysis in code_analyses:
                    if analysis.pull_request_id == pr.pull_request_id:
                        notes += f"  - Files changed: {analysis.total_files_changed}\n"
                        if analysis.file_changes:
                            notes += "  - Modified files:\n"
                            for fc in analysis.file_changes[:5]:
                                notes += f"    - `{fc.path}` ({fc.change_type})\n"
                        break
                notes += "\n"

        if bug_fixes:
            notes += "### 🐛 Bug Fixes\n\n"
            for pr in bug_fixes:
                notes += f"- **PR #{pr.pull_request_id}**: {pr.title}\n"
                notes += f"  - Branch: `{pr.source_branch}` → `{pr.target_branch}`\n"
                notes += f"  - Status: {pr.status}\n"
                
                for analysis in code_analyses:
                    if analysis.pull_request_id == pr.pull_request_id:
                        notes += f"  - Files changed: {analysis.total_files_changed}\n"
                        if analysis.file_changes:
                            notes += "  - Modified files:\n"
                            for fc in analysis.file_changes[:5]:
                                notes += f"    - `{fc.path}` ({fc.change_type})\n"
                        break
                notes += "\n"

        if infrastructure_changes:
            notes += "### 🔧 Infrastructure & Refactoring\n\n"
            for pr in infrastructure_changes:
                notes += f"- **PR #{pr.pull_request_id}**: {pr.title}\n"
                notes += f"  - Branch: `{pr.source_branch}` → `{pr.target_branch}`\n"
                notes += f"  - Status: {pr.status}\n"
                
                for analysis in code_analyses:
                    if analysis.pull_request_id == pr.pull_request_id:
                        notes += f"  - Files changed: {analysis.total_files_changed}\n"
                        if analysis.file_changes:
                            notes += "  - Modified files:\n"
                            for fc in analysis.file_changes[:5]:
                                notes += f"    - `{fc.path}` ({fc.change_type})\n"
                        break
                notes += "\n"

        # Task breakdown
        notes += "---\n\n## Task Breakdown\n\n"
        
        task_by_status = {}
        for task in tasks:
            status = task.state
            if status not in task_by_status:
                task_by_status[status] = []
            task_by_status[status].append(task)
        
        for status, task_list in sorted(task_by_status.items()):
            notes += f"### {status} ({len(task_list)})\n\n"
            for task in task_list:
                notes += f"- [{task.id}] {task.title}\n"
            notes += "\n"

        # File impact analysis
        notes += "---\n\n## File Impact Analysis\n\n"
        
        all_files = {}
        for analysis in code_analyses:
            for fc in analysis.file_changes:
                if fc.path not in all_files:
                    all_files[fc.path] = []
                all_files[fc.path].append((analysis.pull_request_id, fc.change_type))
        
        notes += f"**Total unique files affected**: {len(all_files)}\n\n"
        
        # Files modified in multiple PRs
        multi_pr_files = {path: prs for path, prs in all_files.items() if len(prs) > 1}
        if multi_pr_files:
            notes += "### Files Modified in Multiple PRs (High Impact)\n\n"
            for path, pr_list in sorted(multi_pr_files.items(), key=lambda x: len(x[1]), reverse=True):
                notes += f"- `{path}` - Modified in {len(pr_list)} PRs: "
                notes += ", ".join([f"#{pr_id}" for pr_id, _ in pr_list])
                notes += "\n"
            notes += "\n"

        return notes

    def generate_business_release_notes(
        self,
        pbi: WorkItem,
        tasks: List[WorkItem],
        pull_requests: List[PullRequest],
        aggregate_stats: Dict[str, Any],
    ) -> str:
        """Generate business-oriented release notes for stakeholders"""

        # Extract key business value from titles
        notes = f"""# Business Release Notes

## Feature Summary
**{pbi.title}**

### Status: {pbi.state}

---

## What Changed

"""

        # Analyze PBI title for business context
        if "performance" in pbi.title.lower():
            notes += "### 🚀 Performance Enhancement\n\n"
            notes += "This release includes significant performance improvements to the application infrastructure.\n\n"
        
        if "framework" in pbi.title.lower():
            notes += "### 🏗️ Framework Improvements\n\n"
            notes += "Core framework enhancements to improve system reliability and maintainability.\n\n"

        # Business impact
        notes += "## Business Impact\n\n"
        
        completed_prs = [pr for pr in pull_requests if pr.status.lower() == "completed"]
        active_prs = [pr for pr in pull_requests if pr.status.lower() == "active"]
        
        notes += f"- **Completed Changes**: {len(completed_prs)} pull requests merged\n"
        notes += f"- **In Progress**: {len(active_prs)} pull requests under review\n"
        notes += f"- **Code Stability**: {aggregate_stats['unique_files_affected']} files improved\n"
        
        # Calculate task completion
        completed_tasks = [t for t in tasks if t.state.lower() in ["done", "closed", "resolved"]]
        in_progress_tasks = [t for t in tasks if t.state.lower() == "in progress"]
        
        completion_rate = (len(completed_tasks) / len(tasks) * 100) if tasks else 0
        
        notes += f"\n**Work Progress**: {len(completed_tasks)}/{len(tasks)} tasks completed ({completion_rate:.1f}%)\n"
        
        notes += "\n---\n\n## Key Improvements\n\n"

        # Extract improvements from PR titles
        improvements = []
        for pr in pull_requests:
            title = pr.title.lower()
            
            if "cache" in title:
                improvements.append("📦 **Cache Optimization**: Improved caching mechanisms for better data retrieval performance")
            if "performance" in title:
                improvements.append("⚡ **Performance**: Enhanced system response times and efficiency")
            if "grid" in title:
                improvements.append("📊 **Grid Performance**: Optimized grid loading and data handling")
            if "router" in title or "routing" in title:
                improvements.append("🔀 **Routing**: Improved request routing and service architecture")
            if "serialization" in title:
                improvements.append("🔄 **Data Processing**: Enhanced data serialization for faster operations")
            if "jwt" in title or "authentication" in title:
                improvements.append("🔐 **Security**: Improved authentication and token handling")
            if "connection" in title:
                improvements.append("🔌 **Connectivity**: Enhanced connection management and reliability")
            if "restriction" in title:
                improvements.append("🛡️ **Data Security**: Improved data access restrictions and controls")

        # Remove duplicates
        improvements = list(set(improvements))
        
        for improvement in improvements:
            notes += f"- {improvement}\n"
        
        if not improvements:
            notes += "- System infrastructure and code quality improvements\n"

        notes += "\n---\n\n## Technical Highlights\n\n"
        notes += f"- Modified {aggregate_stats['unique_files_affected']} core system files\n"
        notes += f"- Total code changes: {aggregate_stats['total_additions']} additions, {aggregate_stats['total_deletions']} deletions\n"
        notes += f"- {len(pull_requests)} separate changes merged or in review\n"

        notes += "\n---\n\n## Next Steps\n\n"
        
        if in_progress_tasks:
            notes += f"**Ongoing Work**: {len(in_progress_tasks)} tasks currently in progress:\n\n"
            for task in in_progress_tasks[:5]:  # Show first 5
                # Extract business-friendly description
                task_desc = task.title
                # Remove technical prefixes
                for prefix in ["ACM", "US2", "R&D", "Infrastructure -"]:
                    task_desc = task_desc.replace(prefix, "").strip()
                notes += f"- {task_desc}\n"
            
            if len(in_progress_tasks) > 5:
                notes += f"- ... and {len(in_progress_tasks) - 5} more\n"
        
        new_tasks = [t for t in tasks if t.state.lower() == "new"]
        if new_tasks:
            notes += f"\n**Planned Work**: {len(new_tasks)} tasks planned for upcoming iterations\n"

        notes += "\n---\n\n## Summary\n\n"
        notes += f"This release represents a significant step forward in {pbi.title.split('-')[0].strip()} "
        notes += f"with {len(completed_prs)} completed improvements and {len(active_prs)} additional changes under review. "
        notes += f"The work impacts {aggregate_stats['unique_files_affected']} system components and contributes to "
        notes += "overall system performance, reliability, and maintainability.\n"

        return notes
