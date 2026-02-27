"""Code change analyzer"""

from typing import List, Dict, Any
from .models import FileChange, CodeAnalysis, PullRequest
from .azure_client import AzureDevOpsClient


class CodeAnalyzer:
    """Analyzes code changes in pull requests"""

    def __init__(self, azure_client: AzureDevOpsClient):
        self.azure_client = azure_client

    async def analyze_pull_request(self, pr: PullRequest) -> CodeAnalysis:
        """Analyze code changes in a pull request"""
        if not pr.repository_id:
            return CodeAnalysis(
                pull_request_id=pr.pull_request_id,
                total_files_changed=0,
                total_additions=0,
                total_deletions=0,
                file_changes=[],
                summary="Repository information not available",
            )

        try:
            changes = await self.azure_client.get_pull_request_changes(
                pr.repository_id, pr.pull_request_id
            )

            file_changes = []
            total_additions = 0
            total_deletions = 0

            for change in changes:
                item = change.get("item", {})
                change_type = change.get("changeType", "edit")

                # Parse path
                path = item.get("path", "unknown")

                # Get change counts (if available in the API)
                # Note: Azure DevOps API might not always provide line counts
                # You may need to fetch actual diffs for accurate counts
                file_change = FileChange(
                    path=path,
                    change_type=change_type,
                    additions=0,  # Would need diff parsing
                    deletions=0,  # Would need diff parsing
                    changes=1,
                )

                file_changes.append(file_change)

            # Generate summary
            summary = self._generate_summary(len(file_changes), total_additions, total_deletions)

            return CodeAnalysis(
                pull_request_id=pr.pull_request_id,
                total_files_changed=len(file_changes),
                total_additions=total_additions,
                total_deletions=total_deletions,
                file_changes=file_changes,
                summary=summary,
            )

        except Exception as e:
            return CodeAnalysis(
                pull_request_id=pr.pull_request_id,
                total_files_changed=0,
                total_additions=0,
                total_deletions=0,
                file_changes=[],
                summary=f"Error analyzing PR: {str(e)}",
            )

    def _generate_summary(
        self, files_changed: int, additions: int, deletions: int
    ) -> str:
        """Generate a human-readable summary of changes"""
        if files_changed == 0:
            return "No files changed"

        parts = [f"{files_changed} dosya değiştirildi"]

        if additions > 0:
            parts.append(f"{additions} satır eklendi")
        if deletions > 0:
            parts.append(f"{deletions} satır silindi")

        return ", ".join(parts)

    async def analyze_multiple_prs(self, prs: List[PullRequest]) -> List[CodeAnalysis]:
        """Analyze multiple pull requests"""
        analyses = []
        for pr in prs:
            analysis = await self.analyze_pull_request(pr)
            analyses.append(analysis)
        return analyses

    def aggregate_analysis(self, analyses: List[CodeAnalysis]) -> Dict[str, Any]:
        """Aggregate multiple code analyses into summary statistics"""
        total_files = sum(a.total_files_changed for a in analyses)
        total_additions = sum(a.total_additions for a in analyses)
        total_deletions = sum(a.total_deletions for a in analyses)

        # Collect all unique file paths
        all_files = set()
        for analysis in analyses:
            for fc in analysis.file_changes:
                all_files.add(fc.path)

        return {
            "total_pull_requests": len(analyses),
            "total_files_changed": total_files,
            "unique_files_affected": len(all_files),
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "net_change": total_additions - total_deletions,
        }
