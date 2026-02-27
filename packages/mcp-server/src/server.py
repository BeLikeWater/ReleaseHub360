"""Azure PBI Analyzer MCP Server"""

import asyncio
import os
from typing import Any
from dotenv import load_dotenv

from mcp.server.models import InitializationOptions
import mcp.types as types
from mcp.server import NotificationOptions, Server
import mcp.server.stdio

from .azure_client import AzureDevOpsClient
from .code_analyzer import CodeAnalyzer
from .release_note_generator import ReleaseNoteGenerator
from .ai_release_note_generator import AIReleaseNoteGenerator
from .models import PBIAnalysisResult

# Load environment variables
load_dotenv()

# Initialize server
server = Server("azure-pbi-analyzer")

# Initialize clients
azure_client = AzureDevOpsClient()
code_analyzer = CodeAnalyzer(azure_client)
release_note_generator = ReleaseNoteGenerator()
ai_release_note_generator = AIReleaseNoteGenerator()


@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools"""
    return [
        types.Tool(
            name="analyze-pbi",
            description="Analyze a Product Backlog Item (PBI) including its tasks, pull requests, and code changes",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item to analyze",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="get-pbi-details",
            description="Get detailed information about a specific PBI",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="list-pbi-pull-requests",
            description="List all pull requests related to a PBI and its tasks",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="analyze-code-changes",
            description="Analyze code changes in pull requests for a PBI",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="generate-technical-release-notes",
            description="Generate technical release notes from PBI analysis for developers",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="generate-business-release-notes",
            description="Generate business-oriented release notes from PBI analysis for stakeholders",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="generate-ai-technical-release-notes",
            description="Generate AI-powered concise technical release notes focused on actual code changes (methods, tables, parameters)",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="generate-ai-business-release-notes",
            description="Generate AI-powered business release notes with impact analysis (what changed, expected business impact)",
            inputSchema={
                "type": "object",
                "properties": {
                    "pbi_id": {
                        "type": "integer",
                        "description": "The ID of the Product Backlog Item",
                    }
                },
                "required": ["pbi_id"],
            },
        ),
        types.Tool(
            name="get-file-content",
            description="Get file content from an Azure DevOps repository",
            inputSchema={
                "type": "object",
                "properties": {
                    "repository_id": {
                        "type": "string",
                        "description": "Repository ID or name (e.g., 'DigitalBank' for TFS repos)",
                    },
                    "file_path": {
                        "type": "string",
                        "description": "Full path to the file in the repository",
                    },
                    "branch": {
                        "type": "string",
                        "description": "Branch name (default: main)",
                        "default": "main"
                    }
                },
                "required": ["repository_id", "file_path"],
            },
        ),
    ]


@server.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any]
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    """Handle tool execution"""

    if name == "analyze-pbi":
        pbi_id = arguments["pbi_id"]

        # Get PBI details
        pbi = await azure_client.get_work_item(pbi_id)

        # Get related tasks
        tasks = await azure_client.get_child_work_items(pbi_id)

        # Get pull requests for PBI and all tasks
        all_work_items = [pbi] + tasks
        all_prs = []

        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)

        # Remove duplicates
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)

        # Analyze code changes
        code_analyses = await code_analyzer.analyze_multiple_prs(all_prs)

        # Aggregate statistics
        aggregate_stats = code_analyzer.aggregate_analysis(code_analyses)

        # Build summary
        summary = f"""
# PBI Analysis: {pbi.title}

## PBI Details
- **ID**: {pbi.id}
- **State**: {pbi.state}
- **Assigned To**: {pbi.assigned_to or 'Unassigned'}

## Related Tasks
{len(tasks)} task(s) found:
{chr(10).join(f"- [{t.id}] {t.title} ({t.state})" for t in tasks)}

## Pull Requests
{len(all_prs)} pull request(s) found:
{chr(10).join(f"- PR #{pr.pull_request_id}: {pr.title} ({pr.status})" for pr in all_prs)}

## Code Change Summary
- **Total PRs**: {aggregate_stats['total_pull_requests']}
- **Total Files Changed**: {aggregate_stats['total_files_changed']}
- **Unique Files Affected**: {aggregate_stats['unique_files_affected']}
- **Total Additions**: {aggregate_stats['total_additions']}
- **Total Deletions**: {aggregate_stats['total_deletions']}
- **Net Change**: {aggregate_stats['net_change']} lines

## Detailed File Changes
{chr(10).join(f"### PR #{analysis.pull_request_id}{chr(10)}{chr(10).join(f'- {fc.path} ({fc.change_type})' for fc in analysis.file_changes)}" for analysis in code_analyses if analysis.file_changes)}
"""

        return [types.TextContent(type="text", text=summary)]

    elif name == "get-pbi-details":
        pbi_id = arguments["pbi_id"]
        pbi = await azure_client.get_work_item(pbi_id)

        details = f"""
# PBI Details

- **ID**: {pbi.id}
- **Title**: {pbi.title}
- **Type**: {pbi.work_item_type}
- **State**: {pbi.state}
- **Assigned To**: {pbi.assigned_to or 'Unassigned'}
- **Created**: {pbi.created_date or 'Unknown'}

## Description
{pbi.description or 'No description'}
"""

        return [types.TextContent(type="text", text=details)]

    elif name == "list-pbi-pull-requests":
        pbi_id = arguments["pbi_id"]

        # Get PBI and tasks
        pbi = await azure_client.get_work_item(pbi_id)
        tasks = await azure_client.get_child_work_items(pbi_id)

        # Get all PRs
        all_work_items = [pbi] + tasks
        all_prs = []

        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            for pr in prs:
                all_prs.append((work_item.id, work_item.title, pr))

        # Remove duplicate PRs
        seen_prs = set()
        unique_prs = []
        for wi_id, wi_title, pr in all_prs:
            if pr.pull_request_id not in seen_prs:
                seen_prs.add(pr.pull_request_id)
                unique_prs.append((wi_id, wi_title, pr))

        result = f"# Pull Requests for PBI {pbi_id}\n\n"
        result += f"Found {len(unique_prs)} pull request(s):\n\n"

        for wi_id, wi_title, pr in unique_prs:
            result += f"""
## PR #{pr.pull_request_id}: {pr.title}
- **Status**: {pr.status}
- **Source**: {pr.source_branch} → {pr.target_branch}
- **Created By**: {pr.created_by or 'Unknown'}
- **Created**: {pr.creation_date or 'Unknown'}
- **Related Work Item**: [{wi_id}] {wi_title}
{f"- **Description**: {pr.description}" if pr.description else ""}

"""

        return [types.TextContent(type="text", text=result)]

    elif name == "analyze-code-changes":
        pbi_id = arguments["pbi_id"]

        # Get PBI and tasks
        pbi = await azure_client.get_work_item(pbi_id)
        tasks = await azure_client.get_child_work_items(pbi_id)

        # Get all PRs
        all_work_items = [pbi] + tasks
        all_prs = []

        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)

        # Remove duplicates
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)

        # Analyze changes
        analyses = await code_analyzer.analyze_multiple_prs(all_prs)
        aggregate = code_analyzer.aggregate_analysis(analyses)

        result = f"""
# Code Change Analysis for PBI {pbi_id}

## Summary
- **Total Pull Requests**: {aggregate['total_pull_requests']}
- **Total Files Changed**: {aggregate['total_files_changed']}
- **Unique Files Affected**: {aggregate['unique_files_affected']}
- **Total Lines Added**: {aggregate['total_additions']}
- **Total Lines Deleted**: {aggregate['total_deletions']}
- **Net Change**: {aggregate['net_change']} lines

## Per-PR Analysis
"""

        for analysis in analyses:
            result += f"""
### PR #{analysis.pull_request_id}
- **Files Changed**: {analysis.total_files_changed}
- **Summary**: {analysis.summary}

**Modified Files**:
{chr(10).join(f"- {fc.path} ({fc.change_type})" for fc in analysis.file_changes)}

"""

        return [types.TextContent(type="text", text=result)]

    elif name == "generate-technical-release-notes":
        pbi_id = arguments["pbi_id"]

        # Get all data
        pbi = await azure_client.get_work_item(pbi_id)
        tasks = await azure_client.get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await code_analyzer.analyze_multiple_prs(all_prs)
        aggregate = code_analyzer.aggregate_analysis(analyses)
        
        # Generate technical release notes
        technical_notes = release_note_generator.generate_technical_release_notes(
            pbi, tasks, all_prs, analyses, aggregate
        )
        
        return [types.TextContent(type="text", text=technical_notes)]

    elif name == "generate-business-release-notes":
        pbi_id = arguments["pbi_id"]

        # Get all data
        pbi = await azure_client.get_work_item(pbi_id)
        tasks = await azure_client.get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await code_analyzer.analyze_multiple_prs(all_prs)
        aggregate = code_analyzer.aggregate_analysis(analyses)
        
        # Generate business release notes
        business_notes = release_note_generator.generate_business_release_notes(
            pbi, tasks, all_prs, aggregate
        )
        
        return [types.TextContent(type="text", text=business_notes)]

    elif name == "generate-ai-technical-release-notes":
        pbi_id = arguments["pbi_id"]

        pbi = await azure_client.get_work_item(pbi_id)
        tasks = await azure_client.get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await code_analyzer.analyze_multiple_prs(all_prs)
        
        # Generate AI-powered technical release notes
        technical_notes = ai_release_note_generator.generate_technical_release_notes(
            pbi, all_prs, analyses
        )
        
        return [types.TextContent(type="text", text=technical_notes)]

    elif name == "generate-ai-business-release-notes":
        pbi_id = arguments["pbi_id"]

        pbi = await azure_client.get_work_item(pbi_id)
        tasks = await azure_client.get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await azure_client.get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await code_analyzer.analyze_multiple_prs(all_prs)
        
        # Generate AI-powered business release notes
        business_notes = ai_release_note_generator.generate_business_release_notes(
            pbi, all_prs, analyses
        )
        
        return [types.TextContent(type="text", text=business_notes)]

    elif name == "get-file-content":
        repository_id = arguments["repository_id"]
        file_path = arguments["file_path"]
        branch = arguments.get("branch", "main")
        
        # Get file content
        content = await azure_client.get_file_content(repository_id, file_path, branch)
        
        if content is None:
            return [types.TextContent(
                type="text", 
                text=f"File not found: {file_path} in repository {repository_id} (branch: {branch})"
            )]
        
        return [types.TextContent(
            type="text",
            text=f"# File: {file_path}\n**Repository:** {repository_id}\n**Branch:** {branch}\n\n```\n{content}\n```"
        )]

    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    """Run the server using stdin/stdout streams"""
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="azure-pbi-analyzer",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
