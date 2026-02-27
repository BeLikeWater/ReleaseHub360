"""HTTP API wrapper for Azure PBI Analyzer MCP Server"""

import asyncio
from typing import Any, Dict, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from src.azure_client import AzureDevOpsClient
from src.code_analyzer import CodeAnalyzer
from src.release_note_generator import ReleaseNoteGenerator
from src.ai_release_note_generator import AIReleaseNoteGenerator
from src.llm_release_note_generator import LLMReleaseNoteGenerator
from src.llm_code_analyzer import LLMCodeAnalyzer
from src.structured_release_note_generator import StructuredReleaseNoteGenerator
from src.sensitive_data_analyzer import SensitiveDataAnalyzer

load_dotenv()

# ── Per-request Azure credentials ───────────────────────────────────────────
# Tüm request modeller bunu miras alır; backend azure bilgilerini body'ye inject eder.
class AzureCredsFields(BaseModel):
    azure_org: Optional[str] = None      # Azure DevOps organization (e.g. "arc-product")
    azure_project: Optional[str] = None  # Azure DevOps project      (e.g. "ProductAndDelivery")
    azure_pat: Optional[str] = None      # Personal Access Token


def get_client(req: AzureCredsFields) -> AzureDevOpsClient:
    """Per-request Azure client. Request creds varsa kullanır, yoksa env fallback."""
    if req.azure_org and req.azure_project and req.azure_pat:
        return AzureDevOpsClient(
            organization=req.azure_org,
            project=req.azure_project,
            pat=req.azure_pat,
        )
    if _default_azure_client:
        return _default_azure_client
    raise HTTPException(
        status_code=400,
        detail="Azure credentials eksik: azure_org, azure_project, azure_pat gerekli.",
    )


app = FastAPI(
    title="Azure PBI Analyzer API",
    description="HTTP API for analyzing Azure DevOps PBIs and generating release notes",
    version="1.0.0"
)

# Enable CORS for n8n
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global fallback client (env vars kullanır; set edilmemişse None)
try:
    _default_azure_client = AzureDevOpsClient()
except (ValueError, Exception):
    _default_azure_client = None
# Legacy alias
azure_client = _default_azure_client
code_analyzer = CodeAnalyzer(azure_client)
release_note_generator = ReleaseNoteGenerator()
ai_release_note_generator = AIReleaseNoteGenerator()
llm_release_note_generator = LLMReleaseNoteGenerator(azure_client)
structured_release_note_generator = StructuredReleaseNoteGenerator()
sensitive_data_analyzer = SensitiveDataAnalyzer()


class PBIRequest(AzureCredsFields):
    pbi_id: int
    language: str = "en"  # Default to English, supports "tr" for Turkish


class RepoBranchPRRequest(AzureCredsFields):
    repository_name: str
    target_branch: str
    after_date: str  # ISO 8601 format: '2024-12-20T00:00:00Z'


class PipelineBuildsRequest(AzureCredsFields):
    pipeline_name: str
    top: int = 3  # Number of recent builds to return


class BuildsByPRIdsRequest(AzureCredsFields):
    pr_ids: list[int]  # List of Pull Request IDs
    repository_name: str | None = None  # Optional repository name filter


class WorkItemsRequest(AzureCredsFields):
    work_item_ids: list[int]


class BuildRangePRsRequest(AzureCredsFields):
    repository_name: str
    target_branch: str  # Target branch name (e.g., 'main', 'master', 'develop')
    build_number_from: str  # Starting build number (e.g., "20251212.2")
    build_number_to: str    # Ending build number (e.g., "20251215.5")


class DateRangePRsRequest(AzureCredsFields):
    repository_name: str
    target_branch: str  # Target branch name (e.g., 'main', 'master', 'develop')
    start_date: str  # Start date in ISO 8601 format (e.g., '2024-12-20T00:00:00Z')
    end_date: str | None = None  # End date in ISO 8601 format. If not provided, uses current date


class ProjectReleasesRequest(AzureCredsFields):
    organization: str
    project: str
    definition_name: str | None = None  # Optional release definition name filter


class FileContentRequest(AzureCredsFields):
    repository_id: str  # Repository ID or name (e.g., 'DigitalBank')
    file_path: str      # Full path to the file
    branch: str = "main"  # Branch name (default: main)


class SensitiveDataScanRequest(AzureCredsFields):
    repository_id: str  # Project name (e.g., 'ProductAndDelivery')
    file_path: str      # Full path to the file
    keyword: str        # The flagged keyword to analyze
    policy: str | None = None  # Policy name (e.g., 'Keyword Politikası', 'Sunucu/Adi Politikası')
    context_lines: int = 5  # Number of lines to show around each occurrence (reduced for large files)
    max_occurrences: int = 20  # Maximum occurrences to analyze (prevents token limit issues)


class CompletedPRsRequest(AzureCredsFields):
    repository_name: str  # Repository name (e.g., 'PowerBIDesktop')
    target_branch: str  # Target branch name (e.g., 'features/vacit/mstr_bk1')


class CodeSyncPreviewRequest(AzureCredsFields):
    repository_name: str  # Repository name (e.g., 'ETX.Infrastructure')
    source_branch: str  # Source branch - your master (e.g., 'features/vacit/mstr_bk1')
    target_branch: str  # Target branch - customer branch (e.g., 'features/vacit/mstr_bk2')
    pr_ids: list[int]  # List of PR IDs to preview (e.g., [78103, 78104])


class CodeSyncExecuteRequest(AzureCredsFields):
    repository_name: str  # Repository name (e.g., 'ETX.Infrastructure')
    source_branch: str  # Source branch - your master (e.g., 'features/vacit/mstr_bk1')
    target_branch: str  # Target branch - customer branch (e.g., 'features/vacit/mstr_bk2')
    pr_ids: list[int]  # List of PR IDs to sync (e.g., [78103])
    auto_resolve_conflicts: bool = False  # Use AI to resolve conflicts
    sync_branch_prefix: str = "sync"  # Prefix for sync branch name


class PBIAnalysisResponse(BaseModel):
    pbi: Dict[str, Any]
    tasks: list[Dict[str, Any]]
    pull_requests: list[Dict[str, Any]]
    code_statistics: Dict[str, Any]
    summary: str


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "Azure PBI Analyzer API",
        "version": "1.0.0",
        "endpoints": {
            "GET /health": "Health check",
            "POST /api/pbi/analyze": "Analyze a PBI",
            "POST /api/pbi/details": "Get PBI details",
            "POST /api/pbi/pull-requests": "List PBI pull requests",
            "POST /api/pbi/code-changes": "Analyze code changes",
            "POST /api/repo/pull-requests": "List PRs by repository and branch",
            "POST /api/repository/prs-by-build-range": "Get PRs between two build numbers",
            "POST /api/repository/prs-by-date-range": "Get PRs between two dates",
            "POST /api/repository/completed-prs": "Get completed PRs by repository and target branch",
            "POST /api/code-sync/preview": "Preview code sync merge conflicts and changes",
            "POST /api/code-sync/execute": "Execute code sync by creating sync branch and PR",
            "POST /api/pipeline/builds": "List recent pipeline builds",
            "POST /api/pipeline/builds-by-prids": "Get builds for specific PR IDs",
            "POST /api/workitems/details": "Get work items by IDs",
            "POST /api/project/releases": "Get project release definitions and active releases",
            "POST /api/repository/file-content": "Get file content from repository",
            "POST /api/security/scan-sensitive-data": "Analyze sensitive data findings (AI-powered)",
            "POST /api/release-notes/technical": "Generate technical release notes",
            "POST /api/release-notes/business": "Generate business release notes",
            "POST /api/release-notes/structured": "Generate structured release notes (AI-powered)",
            "POST /api/release-notes/structured-for-specific-pbi": "Generate structured release notes for specific PBI only (no child tasks)",
            "POST /api/ai/analyze-cv": "Analyze CV against a role description and return 0-100 compatibility score (LLM-powered)"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for n8n monitoring"""
    return {"status": "healthy", "service": "azure-pbi-analyzer"}


@app.post("/api/pbi/analyze")
async def analyze_pbi(request: PBIRequest):
    """Complete PBI analysis"""
    try:
        pbi_id = request.pbi_id
        
        # Get PBI details
        pbi = await get_client(request).get_work_item(pbi_id)
        
        # Get related tasks
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        # Get pull requests
        all_work_items = [pbi] + tasks
        all_prs = []
        
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        # Analyze code changes
        code_analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        aggregate_stats = CodeAnalyzer(get_client(request)).aggregate_analysis(code_analyses)
        
        return {
            "pbi": pbi.model_dump(),
            "tasks": [t.model_dump() for t in tasks],
            "pull_requests": [pr.model_dump() for pr in all_prs],
            "code_statistics": aggregate_stats,
            "code_analyses": [a.model_dump() for a in code_analyses],
            "summary": f"Found {len(tasks)} tasks, {len(all_prs)} PRs, {aggregate_stats['unique_files_affected']} files affected"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pbi/details")
async def get_pbi_details(request: PBIRequest):
    """Get PBI details only"""
    try:
        pbi = await get_client(request).get_work_item(request.pbi_id)
        return {"pbi": pbi.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pbi/pull-requests")
async def list_pbi_pull_requests(request: PBIRequest):
    """List all pull requests for a PBI"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            for pr in prs:
                all_prs.append({
                    "work_item_id": work_item.id,
                    "work_item_title": work_item.title,
                    "pull_request": pr.model_dump()
                })
        
        # Remove duplicate PRs
        seen = set()
        unique_prs = []
        for item in all_prs:
            pr_id = item["pull_request"]["pull_request_id"]
            if pr_id not in seen:
                seen.add(pr_id)
                unique_prs.append(item)
        
        return {
            "total_pull_requests": len(unique_prs),
            "pull_requests": unique_prs
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pbi/code-changes")
async def analyze_code_changes(request: PBIRequest):
    """Analyze code changes for a PBI"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        aggregate = CodeAnalyzer(get_client(request)).aggregate_analysis(analyses)
        
        return {
            "aggregate_statistics": aggregate,
            "per_pr_analysis": [a.model_dump() for a in analyses]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/repo/pull-requests")
async def list_repo_pull_requests(request: RepoBranchPRRequest):
    """List pull requests for a repository filtered by target branch and date
    
    This endpoint returns all pull requests targeting a specific branch 
    that were created after a given date.
    
    Request body:
    - repository_name: Name of the repository
    - target_branch: Target branch name (e.g., 'main', 'master', 'develop')
    - after_date: ISO 8601 date string (e.g., '2024-12-20T00:00:00Z')
    
    Response includes:
    - PR number (pullRequestId)
    - PR title
    - Creator (createdBy)
    - Creation date (creationDate)
    - Status (status: 'active', 'completed', 'abandoned')
    """
    try:
        prs = await get_client(request).get_pull_requests_by_repo_and_branch(
            repository_name=request.repository_name,
            target_branch=request.target_branch,
            after_date=request.after_date
        )
        
        # Format the response
        pr_list = []
        for pr in prs:
            pr_list.append({
                "pull_request_id": pr.pull_request_id,
                "title": pr.title,
                "created_by": pr.created_by,
                "creation_date": pr.creation_date,
                "status": pr.status,
                "source_branch": pr.source_branch,
                "target_branch": pr.target_branch,
                "description": pr.description,
                "work_item_ids": pr.work_item_ids,
                "url": pr.url
            })
        
        return {
            "repository": request.repository_name,
            "target_branch": request.target_branch,
            "after_date": request.after_date,
            "total_pull_requests": len(pr_list),
            "pull_requests": pr_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/repository/prs-by-build-range")
async def get_prs_by_build_range(request: BuildRangePRsRequest):
    """Get all PRs merged between two build numbers in a repository
    
    This endpoint finds PRs merged between two builds by:
    1. Finding the builds with given build numbers
    2. Extracting PR IDs from their commit messages (e.g., "Merged PR 26042:")
    3. Getting merge dates of those PRs
    4. Returning all PRs merged between those dates (inclusive)
    
    Request body:
    - repository_name: Repository name (e.g., "PowerBIDesktop")
    - target_branch: Target branch name (e.g., 'main', 'master', 'develop')
    - build_number_from: Starting build number (e.g., "20251212.2")
    - build_number_to: Ending build number (e.g., "20251215.5")
    
    Response includes:
    - repository_name: The repository name
    - build_range: Details of from/to builds and their PRs
    - total_pull_requests: Number of PRs in the range
    - pull_requests: List of all PRs with:
        - pull_request_id, title, created_by, creation_date, status
        - source_branch, target_branch, description, work_item_ids, url
    """
    try:
        result = await get_client(request).get_prs_in_build_range(
            request.repository_name,
            request.target_branch,
            request.build_number_from,
            request.build_number_to
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/repository/prs-by-date-range")
async def get_prs_by_date_range(request: DateRangePRsRequest):
    """Get all PRs merged within a date range in a repository
    
    This endpoint finds PRs merged between two dates by:
    1. Taking start_date and optional end_date parameters
    2. If end_date is not provided, uses current date
    3. Returning all PRs merged between those dates (inclusive) targeting the specified branch
    
    Request body:
    - repository_name: Repository name (e.g., "PowerBIDesktop")
    - target_branch: Target branch name (e.g., 'main', 'master', 'develop')
    - start_date: Start date in ISO 8601 format (e.g., '2024-12-20T00:00:00Z')
    - end_date: (Optional) End date in ISO 8601 format. If not provided, uses current date
    
    Response includes:
    - repository: The repository name
    - target_branch: The target branch name
    - date_range: Details of start and end dates
    - total_pull_requests: Number of PRs in the range
    - pull_requests: List of all PRs with:
        - pull_request_id, title, created_by, creation_date, closed_date, status
        - source_branch, target_branch, description, work_item_ids, url
    """
    try:
        result = await get_client(request).get_prs_in_date_range(
            request.repository_name,
            request.target_branch,
            request.start_date,
            request.end_date
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/repository/completed-prs")
async def get_completed_prs_by_target_branch(request: CompletedPRsRequest):
    """Get all completed PRs merged into a specific target branch in a repository
    
    This endpoint finds all completed (merged) PRs where the target branch matches the given branch name.
    
    Request body:
    - repository_name: Repository name (e.g., "PowerBIDesktop")
    - target_branch: Target branch name (e.g., 'features/vacit/mstr_bk1')
    
    Response includes:
    - repository: The repository name
    - target_branch: The target branch name
    - total_pull_requests: Number of completed PRs
    - pull_requests: List of all completed PRs with:
        - pull_request_id, title, created_by, creation_date, closed_date
        - source_branch, target_branch, description, work_item_ids, url
    """
    try:
        result = await get_client(request).get_completed_prs_by_target_branch(
            request.repository_name,
            request.target_branch
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/code-sync/preview")
async def preview_code_sync(request: CodeSyncPreviewRequest):
    """Preview code sync merge - test merging PRs without committing
    
    This endpoint simulates merging specific PRs from source branch to target branch,
    detects conflicts, and calculates risk level.
    
    Request body:
    - repository_name: Repository name (e.g., "ETX.Infrastructure")
    - source_branch: Source branch / your master (e.g., 'features/vacit/mstr_bk1')
    - target_branch: Target branch / customer branch (e.g., 'features/vacit/mstr_bk2')
    - pr_ids: List of PR IDs to preview (e.g., [78103, 78104])
    
    Response includes:
    - status: "success" or "error"
    - can_merge: Boolean indicating if merge is possible without conflicts
    - files_to_change: List of files that will be changed
    - potential_conflicts: List of files with merge conflicts
    - risk_level: Risk level ("low", "medium", "high")
    - statistics: Change statistics (additions, deletions, etc.)
    - preview_summary: Human-readable summary
    """
    try:
        result = await get_client(request).preview_code_sync_merge(
            request.repository_name,
            request.source_branch,
            request.target_branch,
            request.pr_ids
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/code-sync/execute")
async def execute_code_sync(request: CodeSyncExecuteRequest):
    """Execute code sync by creating sync branch and PR
    
    This endpoint creates a sync branch, merges specified PRs, handles conflicts,
    and creates a PR for review.
    
    Request body:
    - repository_name: Repository name (e.g., "ETX.Infrastructure")
    - source_branch: Source branch / your master (e.g., 'features/vacit/mstr_bk1')
    - target_branch: Target branch / customer branch (e.g., 'features/vacit/mstr_bk2')
    - pr_ids: List of PR IDs to sync (e.g., [78103])
    - auto_resolve_conflicts: Use AI to resolve conflicts (default: false)
    - sync_branch_prefix: Prefix for sync branch name (default: "sync")
    
    Response includes:
    - status: "success", "conflict", or "failed"
    - sync_branch_name: Created sync branch name
    - merge_commit_id: Merge commit ID (if successful)
    - pr_created: Created PR details (pr_id, pr_url, title, etc.)
    - conflicts: List of conflicted files with resolution status
    - merged_prs: List of merged PRs with commit IDs
    """
    try:
        result = await get_client(request).execute_code_sync(
            request.repository_name,
            request.source_branch,
            request.target_branch,
            request.pr_ids,
            request.auto_resolve_conflicts,
            request.sync_branch_prefix
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/workitems/details")
async def get_work_items_details(request: WorkItemsRequest):
    """Get work items details by their IDs
    
    This endpoint returns detailed information for a list of work item IDs.
    
    Request body:
    - work_item_ids: List of work item IDs (e.g., [206053, 205812, 204990])
    
    Response includes for each work item:
    - id: Work item ID
    - title: Work item title
    - work_item_type: Type (PBI, Bug, Task, etc.)
    - assigned_to: Assigned person name
    - state: Status (New, Active, Resolved, Closed, etc.)
    - created_date: When the work item was created
    """
    try:
        if not request.work_item_ids:
            return {
                "total_work_items": 0,
                "work_items": []
            }
        
        work_items = await get_client(request).get_work_items_bulk(request.work_item_ids)
        
        # Format the response
        work_items_list = []
        for wi in work_items:
            work_items_list.append({
                "id": wi.id,
                "title": wi.title,
                "work_item_type": wi.work_item_type,
                "assigned_to": wi.assigned_to,
                "state": wi.state,
                "created_date": wi.created_date,
                "parent_id": wi.parent_id
            })
        
        return {
            "total_work_items": len(work_items_list),
            "work_items": work_items_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pipeline/builds")
async def list_pipeline_builds(request: PipelineBuildsRequest):
    """List recent builds for a pipeline
    
    This endpoint returns the most recent builds for a specified pipeline.
    
    Request body:
    - pipeline_name: Name of the pipeline
    - top: Number of recent builds to return (default: 3)
    
    Response includes:
    - Build ID and number
    - Status (inProgress, completed, etc.)
    - Result (succeeded, failed, canceled, etc.)
    - Timestamps (queue, start, finish)
    - Source branch
    - Requested by
    """
    try:
        builds = await get_client(request).get_pipeline_builds(
            pipeline_name=request.pipeline_name,
            top=request.top
        )
        
        # Format the response with simplified fields
        build_list = []
        for build in builds:
            build_list.append({
                "title": build["build_title"],
                "build_number": build["build_number"],
                "status": build["result"] if build["result"] else build["status"],
                "finish_time": build["finish_time"] if build["finish_time"] else build["start_time"],
                "source_branch": build["source_branch"],
                "requested_for": build["requested_for"],
                "pr_id": build.get("pr_id"),
                "url": build["url"]
            })
        
        return {
            "pipeline_name": request.pipeline_name,
            "total_builds": len(build_list),
            "builds": build_list
        }
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/pipeline/builds-by-prids")
async def get_builds_by_pr_ids(request: BuildsByPRIdsRequest):
    """Get builds for specific Pull Request IDs
    
    This endpoint returns build information for the given PR IDs.
    Each PR may have multiple builds associated with it.
    
    Request body:
    - pr_ids: List of Pull Request IDs (e.g., [26156, 26157, 26158])
    - repository_name: Optional repository name to filter builds (e.g., "PowerBIDesktop")
    
    Response includes for each build:
    - pr_id: The Pull Request ID
    - pr_title: Pull Request title
    - build_id: Build ID
    - build_number: Build number
    - build_title: Build title with commit message
    - pipeline_name: Pipeline that ran the build
    - status: Build status (inProgress, completed, etc.)
    - result: Build result (succeeded, failed, canceled, etc.)
    - queue_time: When build was queued
    - start_time: When build started
    - finish_time: When build finished
    - source_branch: Source branch of the PR
    - requested_for: Who requested the build
    - url: Link to the build in Azure DevOps
    """
    try:
        if not request.pr_ids:
            return {
                "total_prs": 0,
                "total_builds": 0,
                "builds": []
            }
        
        builds = await get_client(request).get_builds_by_pr_ids(request.pr_ids, request.repository_name)
        
        return {
            "total_prs": len(request.pr_ids),
            "total_builds": len(builds),
            "builds": builds
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/technical")
async def generate_technical_release_notes(request: PBIRequest):
    """Generate technical release notes"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        aggregate = CodeAnalyzer(get_client(request)).aggregate_analysis(analyses)
        
        technical_notes = release_note_generator.generate_technical_release_notes(
            pbi, tasks, all_prs, analyses, aggregate
        )
        
        return {
            "release_notes": technical_notes,
            "format": "markdown"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/business")
async def generate_business_release_notes(request: PBIRequest):
    """Generate business release notes"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        aggregate = CodeAnalyzer(get_client(request)).aggregate_analysis(analyses)
        
        business_notes = release_note_generator.generate_business_release_notes(
            pbi, tasks, all_prs, aggregate
        )
        
        return {
            "release_notes": business_notes,
            "format": "markdown"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/ai-technical")
async def generate_ai_technical_release_notes(request: PBIRequest):
    """Generate AI-powered technical release notes with code analysis"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        
        technical_notes = ai_release_note_generator.generate_technical_release_notes(
            pbi, all_prs, analyses
        )
        
        return {
            "release_notes": technical_notes,
            "format": "markdown"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/ai-business")
async def generate_ai_business_release_notes(request: PBIRequest):
    """Generate AI-powered business release notes with impact analysis"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        
        business_notes = ai_release_note_generator.generate_business_release_notes(
            pbi, all_prs, analyses
        )
        
        return {
            "release_notes": business_notes,
            "format": "markdown"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/structured")
async def generate_structured_release_notes(request: PBIRequest):
    """Generate structured release notes with detailed code change analysis
    
    This endpoint generates AI-powered structured release notes that include:
    - Detailed method and class changes
    - Business impact analysis
    - Technical implementation details
    - Organized by code components
    """
    try:
        pbi_id = request.pbi_id
        language = request.language
        
        print(f"\u23f3 Generating structured release notes for PBI {pbi_id} in {language}...")
        
        # Get PBI and tasks
        print("  Fetching work items...")
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        print(f"  Found {len(tasks)} tasks")
        
        # Get pull requests
        print("  Fetching pull requests...")
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id, only_completed=False)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        print(f"  Found {len(all_prs)} unique pull requests")
        
        if not all_prs:
            print("⚠️  No pull requests found - returning no changes response")
            no_changes_msg = "Hiçbir pull request bulunamadı" if language == "tr" else "No pull requests found"
            return {
                "release_notes": {
                    "releaseNote": {
                        "technical": {
                            "title": f"{pbi.work_item_type}: {pbi.title}",
                            "description": no_changes_msg
                        },
                        "business": {
                            "title": pbi.title,
                            "description": no_changes_msg
                        }
                    },
                    "changes": {
                        "methods": {"added": [], "deleted": [], "updated": []},
                        "classes": {"added": [], "deleted": [], "updated": []}
                    }
                },
                "format": "structured_json",
                "llm_enabled": structured_release_note_generator.llm_enabled
            }
        
        # Get code analyses
        print("  Analyzing code changes...")
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        
        # Get PR diffs for LLM analysis (limit to avoid timeout)
        print("  Fetching diffs...")
        all_diffs = {}
        for i, pr in enumerate(all_prs[:5]):  # Limit to first 5 PRs
            if pr.repository_id:
                print(f"    PR {i+1}/{min(5, len(all_prs))}...")
                try:
                    diffs = await get_client(request).get_pr_diffs(pr.repository_id, pr.pull_request_id)
                    all_diffs[pr.pull_request_id] = diffs
                except Exception as e:
                    print(f"    Error fetching diffs for PR {pr.pull_request_id}: {e}")
        
        # Collect all file changes
        all_file_changes = []
        for analysis in analyses:
            all_file_changes.extend(analysis.file_changes)
        
        # Generate structured release notes
        print("  Generating notes with LLM...")
        release_notes = await structured_release_note_generator.generate_structured_release_notes(
            pbi=pbi,
            pull_requests=all_prs,
            diffs=all_diffs,
            file_changes=all_file_changes,
            language=language
        )
        
        print("✅ Release notes generated successfully")
        
        return {
            "release_notes": release_notes.model_dump() if hasattr(release_notes, 'model_dump') else release_notes,
            "format": "structured_json",
            "llm_enabled": structured_release_note_generator.llm_enabled
        }
        
    except Exception as e:
        import traceback
        print(f"❌ Error generating structured release notes: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/structured-for-specific-pbi")
async def generate_structured_release_notes_for_specific_pbi(request: PBIRequest):
    """Generate structured release notes for a specific PBI only (no child tasks)
    
    This endpoint generates AI-powered structured release notes that include:
    - Detailed method and class changes
    - Business impact analysis
    - Technical implementation details
    - Organized by code components
    
    Note: This version only analyzes PRs directly linked to the given PBI,
    without including child tasks. Use /api/release-notes/structured for full hierarchy.
    """
    try:
        pbi_id = request.pbi_id
        language = request.language
        
        print(f"\u23f3 Generating structured release notes for specific PBI {pbi_id} in {language}...")
        
        # Get only the PBI (no child tasks)
        print("  Fetching work item...")
        pbi = await get_client(request).get_work_item(pbi_id)
        
        # Get pull requests only for this specific PBI
        print("  Fetching pull requests for PBI...")
        all_prs = await get_client(request).get_pull_requests_by_work_item(pbi.id, only_completed=False)
        print(f"  Found {len(all_prs)} pull requests")
        
        if not all_prs:
            print("⚠️  No pull requests found for this PBI - returning no changes response")
            no_changes_msg = "Bu PBI'a bağlı hiçbir pull request bulunamadı" if language == "tr" else "No pull requests found for this PBI"
            return {
                "release_notes": {
                    "releaseNote": {
                        "technical": {
                            "title": f"{pbi.work_item_type}: {pbi.title}",
                            "description": no_changes_msg
                        },
                        "business": {
                            "title": pbi.title,
                            "description": no_changes_msg
                        }
                    },
                    "changes": {
                        "methods": {"added": [], "deleted": [], "updated": []},
                        "classes": {"added": [], "deleted": [], "updated": []}
                    }
                },
                "format": "structured_json",
                "llm_enabled": structured_release_note_generator.llm_enabled
            }
        
        # Get code analyses
        print("  Analyzing code changes...")
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        
        # Get PR diffs for LLM analysis (limit to avoid timeout)
        print(f"  Fetching diffs for {len(all_prs)} PRs...")
        all_diffs = {}
        prs_to_analyze = all_prs[:3]  # Limit to first 3 PRs to avoid timeout
        print(f"  📋 Will analyze {len(prs_to_analyze)} out of {len(all_prs)} PRs")
        
        for i, pr in enumerate(prs_to_analyze, 1):
            if pr.repository_id:
                print(f"  🔍 PR {i}/{len(prs_to_analyze)} (ID: {pr.pull_request_id}):")
                try:
                    diffs = await get_client(request).get_pr_diffs(pr.repository_id, pr.pull_request_id)
                    if diffs:
                        all_diffs[pr.pull_request_id] = diffs
                        print(f"    ✅ Got diffs for {len(diffs)} files")
                    else:
                        print(f"    ⚠️  No diffs returned")
                except Exception as e:
                    print(f"    ❌ Error fetching diffs: {e}")
        
        # Collect all file changes
        all_file_changes = []
        for analysis in analyses:
            all_file_changes.extend(analysis.file_changes)
        
        # Generate structured release notes
        print("  Generating notes with LLM...")
        release_notes = await structured_release_note_generator.generate_structured_release_notes(
            pbi=pbi,
            pull_requests=all_prs,
            diffs=all_diffs,
            file_changes=all_file_changes,
            language=language
        )
        
        print("✅ Release notes generated successfully")
        
        # Prepare diff summary
        diff_summary = []
        total_files_with_diffs = 0
        for pr_id, diffs in all_diffs.items():
            total_files_with_diffs += len(diffs)
            for file_path, diff_content in diffs.items():
                line_count = len(diff_content.split('\n')) if diff_content else 0
                diff_summary.append({
                    "pr_id": pr_id,
                    "file_path": file_path,
                    "line_count": line_count
                })
        
        return {
            "release_notes": release_notes.model_dump() if hasattr(release_notes, 'model_dump') else release_notes,
            "format": "structured_json",
            "llm_enabled": structured_release_note_generator.llm_enabled,
            "diff_info": {
                "total_prs_analyzed": len(all_prs),
                "prs_with_diffs_fetched": len(all_diffs),
                "total_files_with_diffs": total_files_with_diffs,
                "files": diff_summary
            }
        }
        
    except Exception as e:
        import traceback
        print(f"❌ Error generating structured release notes for specific PBI: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/llm-technical")
async def generate_llm_technical_release_notes(request: PBIRequest):
    """Generate LLM-powered technical release notes with actual code analysis"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        
        # Use LLM analyzer
        llm_analyses = await LLMReleaseNoteGenerator(get_client(request)).analyze_prs_with_llm(all_prs, analyses)
        
        technical_notes = LLMReleaseNoteGenerator(get_client(request)).generate_technical_release_notes(
            pbi, all_prs, llm_analyses
        )
        
        return {
            "release_notes": technical_notes,
            "format": "markdown",
            "llm_enabled": LLMReleaseNoteGenerator(get_client(request)).llm_enabled
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/release-notes/llm-business")
async def generate_llm_business_release_notes(request: PBIRequest):
    """Generate LLM-powered business release notes with actual code analysis"""
    try:
        pbi_id = request.pbi_id
        
        pbi = await get_client(request).get_work_item(pbi_id)
        tasks = await get_client(request).get_child_work_items(pbi_id)
        
        all_work_items = [pbi] + tasks
        all_prs = []
        for work_item in all_work_items:
            prs = await get_client(request).get_pull_requests_by_work_item(work_item.id)
            all_prs.extend(prs)
        
        unique_prs = {pr.pull_request_id: pr for pr in all_prs}.values()
        all_prs = list(unique_prs)
        
        analyses = await CodeAnalyzer(get_client(request)).analyze_multiple_prs(all_prs)
        
        # Use LLM analyzer
        llm_analyses = await LLMReleaseNoteGenerator(get_client(request)).analyze_prs_with_llm(all_prs, analyses)
        
        business_notes = LLMReleaseNoteGenerator(get_client(request)).generate_business_release_notes(
            pbi, all_prs, llm_analyses
        )
        
        return {
            "release_notes": business_notes,
            "format": "markdown",
            "llm_enabled": LLMReleaseNoteGenerator(get_client(request)).llm_enabled
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/project/releases")
async def get_project_releases(request: ProjectReleasesRequest):
    """Get all release definitions and their active releases for a project
    
    Request body:
    - organization: Azure DevOps organization name
    - project: Azure DevOps project name
    - definition_name: Optional release definition name to filter (e.g., "Power BI Desktop Release")
    
    Returns:
        - Release definitions for the project
        - Active releases for each definition with:
            - Release name
            - Build number that triggered the release
            - Creation date
            - Stages (environments) with their statuses
    """
    try:
        organization = request.organization
        project = request.project
        definition_name_filter = request.definition_name
        
        # Get all release definitions
        definitions = await get_client(request).get_release_definitions(organization, project)
        
        # Filter by definition name if provided
        if definition_name_filter:
            definitions = [
                d for d in definitions 
                if d.get("name", "").lower() == definition_name_filter.lower()
            ]
            
            if not definitions:
                return {
                    "organization": organization,
                    "project": project,
                    "definitions_count": 0,
                    "data": [],
                    "message": f"No release definition found with name: {definition_name_filter}"
                }
        
        # Get releases for each definition
        result = []
        for definition in definitions:
            definition_id = definition["id"]
            
            # Get releases for this definition
            releases = await get_client(request).get_releases_for_definition(
                organization, 
                project, 
                definition_id,
                top=50  # Get last 50 releases
            )
            
            # Filter only active releases (not abandoned/rejected)
            active_releases = [
                r for r in releases 
                if r["status"] not in ["abandoned", "rejected"]
            ]
            
            result.append({
                "definition": definition,
                "releases": active_releases,
                "active_count": len(active_releases),
                "total_count": len(releases)
            })
        
        return {
            "organization": organization,
            "project": project,
            "definitions_count": len(definitions),
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/repository/file-content")
async def get_file_content(request: FileContentRequest):
    """Get file content from an Azure DevOps repository
    
    Example request:
    ```json
    {
        "repository_id": "DigitalBank",
        "file_path": "BOA.BusinessModules/Main/BOA.CreditCard.Application/UI/BOA.UI.CreditCard.Application.BusinessCardApplication/BusinessCardApplication.xaml.cs",
        "branch": "main"
    }
    ```
    """
    try:
        content = await get_client(request).get_file_content(
            request.repository_id,
            request.file_path,
            request.branch
        )
        
        if content is None:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {request.file_path} in repository {request.repository_id} (branch: {request.branch})"
            )
        
        return {
            "repository_id": request.repository_id,
            "file_path": request.file_path,
            "branch": request.branch,
            "content": content,
            "size": len(content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/security/scan-sensitive-data")
async def scan_sensitive_data(request: SensitiveDataScanRequest):
    """Analyze sensitive data findings with AI validation
    
    This endpoint validates whether a flagged keyword represents real sensitive data
    or a false positive. It provides detailed analysis and remediation recommendations.
    
    Example request:
    ```json
    {
        "repository_id": "ProductAndDelivery",
        "file_path": "DigitalBank/BOA.BusinessModules/Main/BOA.CreditCard.Application/UI/BOA.UI.CreditCard.Application.BusinessCardApplication/BusinessCardApplication.xaml.cs",
        "keyword": "password",
        "policy": "Keyword Politikası",
        "context_lines": 10
    }
    ```
    
    Response includes:
    - is_sensitive: Boolean indicating if this is real sensitive data
    - confidence: Confidence level (high/medium/low)
    - classification: Type of finding (hardcoded_secret, false_positive, etc.)
    - severity: If sensitive, severity level (critical/high/medium/low)
    - occurrences: All occurrences with context and individual analysis
    - recommendation: Detailed remediation steps or false positive explanation
    """
    try:
        # First, get the file content
        file_content = await get_client(request).get_file_content(
            request.repository_id,
            request.file_path
        )
        
        if file_content is None:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {request.file_path} in repository {request.repository_id}"
            )
        
        # Analyze with AI
        analysis = sensitive_data_analyzer.analyze_sensitive_data_finding(
            file_path=request.file_path,
            file_content=file_content,
            keyword=request.keyword,
            policy=request.policy,
            context_lines=request.context_lines,
            max_occurrences=request.max_occurrences
        )
        
        # Add summary for quick review
        total_occurrences = analysis.get("total_occurrences", 0)
        sensitive_count = 0
        false_positive_count = 0
        
        # Count sensitive vs false positive occurrences
        for occ in analysis.get("occurrences", []):
            if occ.get("is_sensitive"):
                sensitive_count += 1
            else:
                false_positive_count += 1
        
        summary = {
            "status": "SENSITIVE DATA FOUND" if analysis.get("is_sensitive") else "FALSE POSITIVE",
            "severity": analysis.get("severity", "none").upper() if analysis.get("is_sensitive") else "NONE",
            "requires_action": analysis.get("is_sensitive", False),
            "confidence": analysis.get("confidence", "unknown").upper(),
            "total_occurrences": total_occurrences,
            "sensitive_occurrences": sensitive_count,
            "false_positive_occurrences": false_positive_count,
            "breakdown": f"{sensitive_count} SENSITIVE, {false_positive_count} FALSE POSITIVE out of {total_occurrences} total"
        }
        
        return {
            "summary": summary,
            "analysis": analysis,
            "file_info": {
                "repository_id": request.repository_id,
                "file_path": request.file_path,
                "keyword": request.keyword,
                "policy": request.policy,
                "file_size": len(file_content)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/code-sync/conflict-history")
async def get_conflict_history_endpoint(
    repository_name: str,
    branch: Optional[str] = None,
    limit: int = 20
):
    """Get historical merge conflicts and their resolutions from commit history"""
    try:
        result = await get_client(request).get_conflict_history(
            repository_name=repository_name,
            branch=branch,
            limit=limit
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── CV Analysis ─────────────────────────────────────────────────────────────

class CVAnalysisRequest(BaseModel):
    role_description: str  # Job role description / requirements
    cv_content: str        # CV / resume text content


@app.post("/api/ai/analyze-cv")
async def analyze_cv(request: CVAnalysisRequest):
    """Analyze a CV against a role description using LLM and return a 0-100 compatibility score.

    Requires OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY in environment.
    """
    try:
        analyzer = LLMCodeAnalyzer()
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=f"LLM not configured: {e}. Set OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY."
        )

    prompt = f"""You are an expert HR recruiter and talent acquisition specialist.

Evaluate the following CV against the given role description and provide a compatibility score.

## Role Description
{request.role_description}

## CV Content
{request.cv_content}

Analyze the match between the CV and role requirements. Consider:
- Required skills and technologies
- Years of experience
- Education requirements
- Domain knowledge
- Soft skills mentioned
- Career trajectory alignment

Return a JSON response with ONLY these fields, no markdown:
{{
  "score": <integer 0-100>,
  "verdict": "<one of: Excellent Match | Good Match | Partial Match | Poor Match | Not Suitable>",
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<missing skill or requirement 1>", "<missing skill or requirement 2>"],
  "recommendation": "<1-2 sentence hiring recommendation>"
}}

Scoring guide:
- 85-100: Excellent match, candidate meets virtually all requirements
- 70-84: Good match, candidate meets most key requirements
- 50-69: Partial match, candidate meets some requirements but has notable gaps
- 25-49: Poor match, significant gaps exist
- 0-24: Not suitable, fundamental misalignment"""

    try:
        response = analyzer.client.chat.completions.create(
            model=analyzer.model,
            messages=[
                {"role": "system", "content": "You are an expert HR recruiter. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=1000,
        )

        import json as _json
        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = _json.loads(raw.strip())

        # Clamp score to valid range
        result["score"] = max(0, min(100, int(result.get("score", 0))))

        return {
            "score": result["score"],
            "verdict": result.get("verdict", ""),
            "summary": result.get("summary", ""),
            "strengths": result.get("strengths", []),
            "gaps": result.get("gaps", []),
            "recommendation": result.get("recommendation", ""),
            "model": analyzer.model,
            "provider": analyzer.provider,
        }

    except _json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8083)
