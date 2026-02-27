"""Data models for Azure DevOps entities"""

from typing import Optional, List
from pydantic import BaseModel, Field


class WorkItem(BaseModel):
    """Azure DevOps work item model"""

    id: int
    title: str
    state: str
    work_item_type: str = Field(alias="workItemType")
    assigned_to: Optional[str] = Field(None, alias="assignedTo")
    created_date: Optional[str] = Field(None, alias="createdDate")
    description: Optional[str] = None
    parent_id: Optional[int] = Field(None, alias="parentId")

    class Config:
        populate_by_name = True


class PullRequest(BaseModel):
    """Azure DevOps pull request model"""

    pull_request_id: int = Field(alias="pullRequestId")
    title: str
    description: Optional[str] = None
    source_branch: str = Field(alias="sourceBranch")
    target_branch: str = Field(alias="targetBranch")
    status: str
    created_by: Optional[str] = Field(None, alias="createdBy")
    creation_date: Optional[str] = Field(None, alias="creationDate")
    repository_id: Optional[str] = Field(None, alias="repositoryId")
    url: Optional[str] = None
    work_item_ids: List[int] = Field(default_factory=list, alias="workItemIds")

    class Config:
        populate_by_name = True


class FileChange(BaseModel):
    """File change in a pull request"""

    path: str
    change_type: str
    additions: int = 0
    deletions: int = 0
    changes: int = 0


class CodeAnalysis(BaseModel):
    """Code change analysis result"""

    pull_request_id: int
    total_files_changed: int
    total_additions: int
    total_deletions: int
    file_changes: List[FileChange]
    summary: str


class PBIAnalysisResult(BaseModel):
    """Complete PBI analysis result"""

    pbi: WorkItem
    related_tasks: List[WorkItem]
    pull_requests: List[PullRequest]
    code_analyses: List[CodeAnalysis]
    summary: str


class MethodChange(BaseModel):
    """Method-level code change"""
    
    name: str
    change_type: str  # added, modified, deleted
    description: Optional[str] = None
    business_impact: Optional[str] = None


class ClassChange(BaseModel):
    """Class-level code change"""
    
    name: str
    change_type: str  # added, modified, deleted
    methods: List[MethodChange] = Field(default_factory=list)
    description: Optional[str] = None
    business_impact: Optional[str] = None


class ChangeDetails(BaseModel):
    """Detailed change information for a file"""
    
    file: str
    type: str  # method, class, configuration, other
    name: str
    change_type: str  # added, modified, deleted
    description: Optional[str] = None
    business_impact: Optional[str] = None
    methods: List[MethodChange] = Field(default_factory=list)


class ReleaseNoteSection(BaseModel):
    """A section in the release notes"""
    
    component: str
    changes: List[ChangeDetails] = Field(default_factory=list)
    summary: Optional[str] = None


class ReleaseNoteOutput(BaseModel):
    """Complete structured release note output"""
    
    summary: str
    business_impact: str
    sections: List[ReleaseNoteSection] = Field(default_factory=list)
    metadata: Optional[dict] = None


class ReleaseStage(BaseModel):
    """Release deployment stage"""
    
    id: int
    name: str
    status: str  # notStarted, inProgress, succeeded, failed, canceled
    rank: int


class Release(BaseModel):
    """Azure DevOps Release"""
    
    id: int
    name: str
    status: str
    created_on: str = Field(alias="createdOn")
    created_by: Optional[str] = Field(None, alias="createdBy")
    release_definition_id: int = Field(alias="releaseDefinitionId")
    release_definition_name: Optional[str] = Field(None, alias="releaseDefinitionName")
    build_number: Optional[str] = Field(None, alias="buildNumber")
    stages: List[ReleaseStage] = Field(default_factory=list)
    
    class Config:
        populate_by_name = True


class ReleaseDefinition(BaseModel):
    """Azure DevOps Release Definition"""
    
    id: int
    name: str
    description: Optional[str] = None
    created_on: Optional[str] = Field(None, alias="createdOn")
    created_by: Optional[str] = Field(None, alias="createdBy")
    
    class Config:
        populate_by_name = True
