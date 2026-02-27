"""Azure DevOps API client"""

import os
import base64
from typing import List, Optional, Dict, Any
import httpx
from .models import WorkItem, PullRequest


class AzureDevOpsClient:
    """Client for Azure DevOps REST API"""

    def __init__(
        self,
        organization: Optional[str] = None,
        project: Optional[str] = None,
        pat: Optional[str] = None,
    ):
        self.organization = organization or os.getenv("AZURE_DEVOPS_ORG")
        self.project = project or os.getenv("AZURE_DEVOPS_PROJECT")
        self.pat = pat or os.getenv("AZURE_DEVOPS_PAT")

        if not all([self.organization, self.project, self.pat]):
            raise ValueError(
                "Azure DevOps credentials required. Set AZURE_DEVOPS_ORG, "
                "AZURE_DEVOPS_PROJECT, and AZURE_DEVOPS_PAT environment variables."
            )

        self.base_url = f"https://dev.azure.com/{self.organization}/{self.project}"
        self.api_version = "7.1"

        # Create authorization header
        auth_string = f":{self.pat}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()
        self.headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/json",
        }

    async def get_work_item(self, work_item_id: int) -> WorkItem:
        """Get a work item by ID"""
        url = f"{self.base_url}/_apis/wit/workitems/{work_item_id}"
        params = {"api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()

            fields = data.get("fields", {})
            return WorkItem(
                id=data["id"],
                title=fields.get("System.Title", ""),
                state=fields.get("System.State", ""),
                workItemType=fields.get("System.WorkItemType", ""),
                assignedTo=fields.get("System.AssignedTo", {}).get("displayName"),
                createdDate=fields.get("System.CreatedDate"),
                description=fields.get("System.Description"),
                parentId=fields.get("System.Parent"),
            )

    async def get_parent_work_item(self, work_item_id: int) -> Optional[WorkItem]:
        """Get parent work item if exists"""
        url = f"{self.base_url}/_apis/wit/workitems/{work_item_id}"
        params = {"$expand": "relations", "api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()

            relations = data.get("relations", [])

            for relation in relations:
                if relation.get("rel") == "System.LinkTypes.Hierarchy-Reverse":
                    # Extract parent work item ID from URL
                    url_parts = relation.get("url", "").split("/")
                    if url_parts:
                        try:
                            parent_id = int(url_parts[-1])
                            return await self.get_work_item(parent_id)
                        except (ValueError, Exception):
                            continue

            return None

    async def get_child_work_items(self, parent_id: int) -> List[WorkItem]:
        """Get child work items (tasks) of a parent work item
        
        If the provided work item is a child (Task, Bug, etc.), 
        automatically finds its parent and returns siblings.
        """
        url = f"{self.base_url}/_apis/wit/workitems/{parent_id}"
        params = {"$expand": "relations", "api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()

            # Check if this is actually a child item (Task, Bug, etc.)
            fields = data.get("fields", {})
            work_item_type = fields.get("System.WorkItemType", "")
            
            # If it's a Task, find the parent first
            if work_item_type.lower() in ["task", "issue"]:
                parent = await self.get_parent_work_item(parent_id)
                if parent:
                    print(f"ℹ️  Work item {parent_id} is a {work_item_type}. Using parent {parent.id} instead.")
                    return await self.get_child_work_items(parent.id)
            
            # For Bug, treat as standalone - don't search for parent
            # Bug items can have PRs directly attached
            if work_item_type.lower() == "bug":
                print(f"ℹ️  Bug {parent_id} is standalone. No children to fetch.")
                return []

            relations = data.get("relations", [])
            child_ids = []

            for relation in relations:
                if relation.get("rel") == "System.LinkTypes.Hierarchy-Forward":
                    # Extract work item ID from URL
                    url_parts = relation.get("url", "").split("/")
                    if url_parts:
                        try:
                            child_ids.append(int(url_parts[-1]))
                        except ValueError:
                            continue

            # Fetch all child work items
            children = []
            for child_id in child_ids:
                try:
                    child = await self.get_work_item(child_id)
                    children.append(child)
                except Exception as e:
                    print(f"Error fetching child work item {child_id}: {e}")

            return children

    async def get_pull_requests_by_work_item(self, work_item_id: int, only_completed: bool = True) -> List[PullRequest]:
        """Get pull requests associated with a work item
        
        Args:
            work_item_id: Work item ID (PBI, Bug, Task, etc.)
            only_completed: If True, only return completed PRs (default: True)
        """
        # First, get the work item to extract PR links
        url = f"{self.base_url}/_apis/wit/workitems/{work_item_id}"
        params = {"$expand": "relations", "api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()

            relations = data.get("relations", [])
            pr_ids = []

            for relation in relations:
                # Look for pull request links
                rel_type = relation.get("rel", "")
                artifact_url = relation.get("url", "")
                
                # Check if it's an artifact link with pull request
                if rel_type == "ArtifactLink" and "PullRequestId" in artifact_url:
                    # Extract PR ID from vstfs URL
                    # Format: vstfs:///Git/PullRequestId/{projectId}%2F{repoId}%2F{prId}
                    try:
                        import urllib.parse
                        # URL decode first
                        decoded_url = urllib.parse.unquote(artifact_url)
                        # Split by / and get the last part (PR ID)
                        parts = decoded_url.split("/")
                        pr_id = int(parts[-1])
                        pr_ids.append(pr_id)
                    except (ValueError, IndexError):
                        continue

            # Fetch PR details
            pull_requests = []
            for pr_id in pr_ids:
                try:
                    pr = await self.get_pull_request(pr_id)
                    if pr:
                        # Filter by status if requested
                        if only_completed:
                            if pr.status.lower() == "completed":
                                pull_requests.append(pr)
                        else:
                            pull_requests.append(pr)
                except Exception as e:
                    print(f"Error fetching PR {pr_id}: {e}")

            return pull_requests

    async def get_pull_request(self, pr_id: int, repository_id: Optional[str] = None) -> PullRequest:
        """Get pull request details"""
        # If no repository specified, search across all repos
        if not repository_id:
            pr = await self._search_pull_request(pr_id)
            if pr:
                return pr

        # Otherwise get from specific repository
        url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}"
        params = {"api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()

            return self._parse_pull_request(data)

    async def _search_pull_request(self, pr_id: int) -> Optional[PullRequest]:
        """Search for a pull request across all repositories"""
        url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/pullrequests/{pr_id}"
        params = {"api-version": self.api_version}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=self.headers, params=params)
                response.raise_for_status()
                data = response.json()
                return self._parse_pull_request(data)
        except Exception:
            return None

    def _parse_pull_request(self, data: Dict[str, Any]) -> PullRequest:
        """Parse pull request data from API response"""
        return PullRequest(
            pullRequestId=data.get("pullRequestId"),
            title=data.get("title", ""),
            description=data.get("description"),
            sourceBranch=data.get("sourceRefName", "").replace("refs/heads/", ""),
            targetBranch=data.get("targetRefName", "").replace("refs/heads/", ""),
            status=data.get("status", ""),
            createdBy=data.get("createdBy", {}).get("displayName"),
            creationDate=data.get("creationDate"),
            repositoryId=data.get("repository", {}).get("id"),
            url=data.get("url"),
            workItemIds=[],  # Will be populated separately if needed
        )

    async def get_work_items_bulk(self, work_item_ids: List[int]) -> List[WorkItem]:
        """Get multiple work items by their IDs
        
        Args:
            work_item_ids: List of work item IDs to fetch
        
        Returns:
            List of WorkItem objects
        """
        if not work_item_ids:
            return []
        
        # Azure DevOps supports batch API for work items
        url = f"{self.base_url}/_apis/wit/workitems"
        params = {
            "ids": ",".join(map(str, work_item_ids)),
            "api-version": self.api_version
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            work_items = []
            for item_data in data.get("value", []):
                fields = item_data.get("fields", {})
                work_item = WorkItem(
                    id=item_data["id"],
                    title=fields.get("System.Title", ""),
                    state=fields.get("System.State", ""),
                    workItemType=fields.get("System.WorkItemType", ""),
                    assignedTo=fields.get("System.AssignedTo", {}).get("displayName"),
                    createdDate=fields.get("System.CreatedDate"),
                    description=fields.get("System.Description"),
                    parentId=fields.get("System.Parent"),
                )
                work_items.append(work_item)
            
            return work_items

    async def get_pull_request_changes(
        self, repository_id: str, pr_id: int
    ) -> List[Dict[str, Any]]:
        """Get file changes in a pull request"""
        url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}/iterations"
        params = {"api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            # Get iterations
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            iterations = response.json().get("value", [])

            if not iterations:
                return []

            # Get changes from the latest iteration
            latest_iteration = iterations[-1]["id"]
            changes_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}/iterations/{latest_iteration}/changes"

            response = await client.get(changes_url, headers=self.headers, params=params)
            response.raise_for_status()
            changes_data = response.json()

            return changes_data.get("changeEntries", [])

    async def get_commit_diffs(self, repository_id: str, commit_id: str) -> Dict[str, Any]:
        """Get actual code diffs for a commit"""
        url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/commits/{commit_id}/changes"
        params = {"api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def get_pr_commits(self, repository_id: str, pr_id: int) -> List[Dict[str, Any]]:
        """Get commits in a pull request"""
        url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}/commits"
        params = {"api-version": self.api_version}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get("value", [])

    async def get_file_diff(self, repository_id: str, item: Dict[str, Any], base_version: str, target_version: str) -> Optional[str]:
        """Get actual diff content for a file
        
        Args:
            repository_id: Repository ID
            item: File item from changeEntries
            base_version: Base commit/version
            target_version: Target commit/version
            
        Returns:
            Diff content as string
        """
        try:
            object_id = item.get("objectId")
            path = item.get("path", "")
            
            if not object_id:
                return None
            
            # Get file content at target version
            url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/blobs/{object_id}"
            params = {"api-version": self.api_version, "$format": "text"}
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers=self.headers, params=params)
                if response.status_code == 200:
                    content = response.text
                    # Return a pseudo-diff showing the file content (last 50 lines for context)
                    lines = content.split('\n')
                    if len(lines) > 50:
                        return f"// File: {path}\n// Showing last 50 lines\n\n" + '\n'.join(lines[-50:])
                    return f"// File: {path}\n\n" + content
                return None
                
        except Exception as e:
            import traceback
            print(f"Error getting diff for {path}: {e}")
            print(traceback.format_exc())
            return None

    async def get_pr_diffs(self, repository_id: str, pr_id: int) -> Dict[str, str]:
        """Get diffs for all files in a PR
        
        Returns:
            Dictionary mapping file paths to diff content
        """
        diffs = {}
        
        try:
            # Get PR changes
            changes = await self.get_pull_request_changes(repository_id, pr_id)
            
            print(f"  📊 PR {pr_id}: Found {len(changes)} file changes total")
            
            # Get commits to find base and target versions
            commits = await self.get_pr_commits(repository_id, pr_id)
            
            if not commits:
                return diffs
            
            base_commit = commits[0].get("commitId") if commits else None
            target_commit = commits[-1].get("commitId") if commits else None
            
            # Filter out binary files and limit to first 15 files to save time/tokens
            files_to_process = []
            for change in changes:
                item = change.get("item", {})
                path = item.get("path", "")
                if path and not path.endswith(('.png', '.jpg', '.gif', '.ico', '.pdf', '.dll', '.exe', '.zip')):
                    files_to_process.append(change)
            
            files_to_process = files_to_process[:15]  # Limit to 15 files
            print(f"  📝 PR {pr_id}: Processing {len(files_to_process)} files (skipped binary files)")
            
            for i, change in enumerate(files_to_process, 1):
                item = change.get("item", {})
                path = item.get("path", "")
                
                print(f"    [{i}/{len(files_to_process)}] Fetching: {path}")
                diff_content = await self.get_file_diff(
                    repository_id, 
                    item,
                    base_commit,
                    target_commit
                )
                if diff_content:
                    diffs[path] = diff_content
            
            return diffs
            
        except Exception as e:
            import traceback
            print(f"Error getting PR diffs for PR {pr_id}: {e}")
            print(traceback.format_exc())
            return diffs

    async def get_pull_requests_by_repo_and_branch(
        self, 
        repository_name: str, 
        target_branch: str, 
        after_date: Optional[str] = None
    ) -> List[PullRequest]:
        """Get pull requests for a specific repository and target branch
        
        Args:
            repository_name: Repository name
            target_branch: Target branch name (e.g., 'main', 'master', 'develop')
            after_date: ISO 8601 date string (e.g., '2024-12-20T00:00:00Z'). 
                       Returns only PRs created after this date. If None, returns all PRs.
        
        Returns:
            List of pull requests matching the criteria
        """
        url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}/pullrequests"
        
        params = {
            "api-version": self.api_version,
            "searchCriteria.targetRefName": f"refs/heads/{target_branch}",
            "searchCriteria.status": "all"  # Get all statuses (active, completed, abandoned)
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            pull_requests = []
            for pr_data in data.get("value", []):
                pr = self._parse_pull_request(pr_data)
                
                # Filter by date if provided
                should_include = True
                if after_date and pr.creation_date:
                    # Parse creation date and compare
                    from datetime import datetime
                    try:
                        pr_date = datetime.fromisoformat(pr.creation_date.replace('Z', '+00:00'))
                        filter_date = datetime.fromisoformat(after_date.replace('Z', '+00:00'))
                        
                        if pr_date < filter_date:
                            should_include = False
                    except Exception as e:
                        print(f"Error parsing date for PR {pr.pull_request_id}: {e}")
                
                if should_include:
                    # Get work items for this PR
                    try:
                        work_items_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}/pullrequests/{pr.pull_request_id}/workitems"
                        work_items_params = {"api-version": self.api_version}
                        
                        work_items_response = await client.get(work_items_url, headers=self.headers, params=work_items_params)
                        if work_items_response.status_code == 200:
                            work_items_data = work_items_response.json()
                            work_item_ids = []
                            for wi in work_items_data.get("value", []):
                                wi_id = wi.get("id")
                                if wi_id:
                                    work_item_ids.append(wi_id)
                            pr.work_item_ids = work_item_ids
                    except Exception as e:
                        print(f"Error fetching work items for PR {pr.pull_request_id}: {e}")
                    
                    pull_requests.append(pr)
            
            return pull_requests

    async def get_pipeline_builds(
        self,
        pipeline_name: str,
        top: int = 3
    ) -> List[Dict[str, Any]]:
        """Get recent builds for a pipeline by name
        
        Args:
            pipeline_name: Name of the pipeline
            top: Number of recent builds to return (default: 3)
        
        Returns:
            List of build information including name, status, and date
        """
        # First, get the pipeline definition by name
        definitions_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/build/definitions"
        params = {"api-version": self.api_version}
        
        async with httpx.AsyncClient() as client:
            # Get all definitions
            response = await client.get(definitions_url, headers=self.headers, params=params)
            response.raise_for_status()
            definitions = response.json().get("value", [])
            
            # Find the definition with matching name
            definition_id = None
            for definition in definitions:
                if definition.get("name", "").lower() == pipeline_name.lower():
                    definition_id = definition.get("id")
                    break
            
            if not definition_id:
                raise ValueError(f"Pipeline '{pipeline_name}' not found")
            
            # Get builds for this definition
            builds_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/build/builds"
            builds_params = {
                "api-version": self.api_version,
                "definitions": definition_id,
                "$top": top,
                "queryOrder": "finishTimeDescending"
            }
            
            response = await client.get(builds_url, headers=self.headers, params=builds_params)
            response.raise_for_status()
            builds_data = response.json().get("value", [])
            
            # Format build information
            builds = []
            for build in builds_data:
                build_id = build.get("id")
                definition_name = build.get("definition", {}).get("name", pipeline_name)
                build_number = build.get("buildNumber", "")
                source_version = build.get("sourceVersion")
                repository_id = build.get("repository", {}).get("id")
                
                build_title = build_number
                pr_id = None
                
                # Get commit message from source version
                if source_version and repository_id:
                    try:
                        commit_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/commits/{source_version}"
                        commit_params = {"api-version": self.api_version}
                        
                        commit_response = await client.get(commit_url, headers=self.headers, params=commit_params)
                        if commit_response.status_code == 200:
                            commit_data = commit_response.json()
                            commit_message = commit_data.get("comment", "")
                            
                            if commit_message:
                                # Extract PR number from commit message
                                # Format: "Merged PR 26156: #206053 : balloon payment validation update"
                                import re
                                pr_match = re.search(r'Merged PR (\d+):', commit_message, re.IGNORECASE)
                                if pr_match:
                                    pr_id = int(pr_match.group(1))
                                
                                # Use first line of commit message for title
                                first_line = commit_message.split('\n')[0].strip()
                                if first_line and first_line != build_number:
                                    build_title = f"{build_number} • {first_line}"
                    except Exception as e:
                        print(f"Could not fetch commit for build {build_id}: {e}")
                
                builds.append({
                    "id": build_id,
                    "build_number": build_number,
                    "build_title": build_title,
                    "pipeline_name": definition_name,
                    "status": build.get("status"),
                    "result": build.get("result"),
                    "queue_time": build.get("queueTime"),
                    "start_time": build.get("startTime"),
                    "finish_time": build.get("finishTime"),
                    "source_branch": build.get("sourceBranch", "").replace("refs/heads/", ""),
                    "requested_for": build.get("requestedFor", {}).get("displayName"),
                    "pr_id": pr_id,
                    "url": build.get("_links", {}).get("web", {}).get("href")
                })
            
            return builds

    async def get_builds_by_pr_ids(self, pr_ids: List[int], repository_name: str = None) -> List[Dict[str, Any]]:
        """Get builds for specific Pull Request IDs
        
        This method searches for builds by looking at recent builds and checking
        their commit messages for "Merged PR {pr_id}" pattern.
        
        Args:
            pr_ids: List of Pull Request IDs
            repository_name: Optional repository name to filter builds
        
        Returns:
            List of build information for each PR
        """
        all_builds = []
        pr_info = {}
        
        async with httpx.AsyncClient() as client:
            # First, get PR details for all requested PRs
            for pr_id in pr_ids:
                try:
                    pr_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/pullrequests/{pr_id}"
                    pr_params = {"api-version": self.api_version}
                    
                    pr_response = await client.get(pr_url, headers=self.headers, params=pr_params)
                    if pr_response.status_code == 200:
                        pr_data = pr_response.json()
                        pr_info[pr_id] = {
                            "title": pr_data.get("title", ""),
                            "repository_id": pr_data.get("repository", {}).get("id")
                        }
                except Exception as e:
                    print(f"Error fetching PR {pr_id}: {e}")
            
            # Now search for builds that mention these PR IDs in their commit messages
            # If repository_name is provided, filter by that repository
            if repository_name:
                # First get the repository ID by name
                repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
                repo_params = {"api-version": self.api_version}
                try:
                    repo_response = await client.get(repo_url, headers=self.headers, params=repo_params)
                    if repo_response.status_code == 200:
                        repository_filter_id = repo_response.json().get("id")
                    else:
                        repository_filter_id = None
                except Exception:
                    repository_filter_id = None
            else:
                repository_filter_id = None
            
            builds_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/build/builds"
            builds_params = {
                "api-version": self.api_version,
                "$top": 1000,  # Increased from 200 to find more builds
                "queryOrder": "finishTimeDescending"
            }
            
            # Add repository filter if provided
            if repository_filter_id:
                builds_params["repositoryId"] = repository_filter_id
                builds_params["repositoryType"] = "TfsGit"
            
            try:
                builds_response = await client.get(builds_url, headers=self.headers, params=builds_params)
                if builds_response.status_code != 200:
                    return all_builds
                
                builds_data = builds_response.json().get("value", [])
                
                import re
                
                # Check each build's commit message for PR references
                for build in builds_data:
                    build_id = build.get("id")
                    source_version = build.get("sourceVersion")
                    repository_id = build.get("repository", {}).get("id")
                    
                    if not source_version or not repository_id:
                        continue
                    
                    try:
                        # Get commit message
                        commit_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/commits/{source_version}"
                        commit_params = {"api-version": self.api_version}
                        
                        commit_response = await client.get(commit_url, headers=self.headers, params=commit_params)
                        if commit_response.status_code == 200:
                            commit_data = commit_response.json()
                            commit_message = commit_data.get("comment", "")
                            
                            # Check if any of our PR IDs are mentioned
                            pr_match = re.search(r'Merged PR (\d+):', commit_message, re.IGNORECASE)
                            if pr_match:
                                found_pr_id = int(pr_match.group(1))
                                
                                # Check if this is one of the PRs we're looking for
                                if found_pr_id in pr_ids:
                                    build_number = build.get("buildNumber", "")
                                    
                                    # Use first line of commit message for title
                                    first_line = commit_message.split('\n')[0].strip()
                                    build_title = f"{build_number} • {first_line}" if first_line else build_number
                                    
                                    pr_title = pr_info.get(found_pr_id, {}).get("title", "")
                                    
                                    all_builds.append({
                                        "pr_id": found_pr_id,
                                        "pr_title": pr_title,
                                        "build_id": build_id,
                                        "build_number": build_number,
                                        "build_title": build_title,
                                        "pipeline_name": build.get("definition", {}).get("name", ""),
                                        "status": build.get("status"),
                                        "result": build.get("result"),
                                        "queue_time": build.get("queueTime"),
                                        "start_time": build.get("startTime"),
                                        "finish_time": build.get("finishTime"),
                                        "source_branch": build.get("sourceBranch", "").replace("refs/heads/", ""),
                                        "requested_for": build.get("requestedFor", {}).get("displayName"),
                                        "url": build.get("_links", {}).get("web", {}).get("href")
                                    })
                                    
                                    # Remove from list to track which PRs we found
                                    if found_pr_id in pr_ids and all(b["pr_id"] != found_pr_id or b["build_id"] != build_id for b in all_builds[:-1]):
                                        # Found a new build for this PR
                                        pass
                    
                    except Exception as e:
                        # Continue to next build if we can't fetch this commit
                        continue
            
            except Exception as e:
                print(f"Error fetching builds: {e}")
        
        return all_builds

    async def get_prs_in_build_range(self, repository_name: str, target_branch: str, build_number_from: str, build_number_to: str) -> Dict[str, Any]:
        """Get all PRs merged between two build numbers in a repository
        
        This method:
        1. Finds builds with the given build numbers
        2. Extracts PR IDs from their commit messages
        3. Gets the merge dates of those PRs
        4. Returns all PRs merged between those dates (inclusive) targeting the specified branch
        
        Args:
            repository_name: Name of the repository
            target_branch: Target branch name to filter PRs
            build_number_from: Starting build number (e.g., "20251212.2")
            build_number_to: Ending build number (e.g., "20251215.5")
        
        Returns:
            Dictionary with PR range info and list of PRs
        """
        async with httpx.AsyncClient() as client:
            # Get repository ID
            repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
            repo_params = {"api-version": self.api_version}
            
            repo_response = await client.get(repo_url, headers=self.headers, params=repo_params)
            if repo_response.status_code != 200:
                raise Exception(f"Repository '{repository_name}' not found")
            
            repository_id = repo_response.json().get("id")
            
            # Search for builds with these build numbers
            builds_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/build/builds"
            builds_params = {
                "api-version": self.api_version,
                "$top": 1000,
                "repositoryId": repository_id,
                "repositoryType": "TfsGit",
                "queryOrder": "finishTimeDescending"
            }
            
            builds_response = await client.get(builds_url, headers=self.headers, params=builds_params)
            if builds_response.status_code != 200:
                raise Exception("Failed to fetch builds")
            
            builds_data = builds_response.json().get("value", [])
            
            # Find the two builds
            build_from = None
            build_to = None
            
            for build in builds_data:
                build_number = build.get("buildNumber", "")
                if build_number == build_number_from:
                    build_from = build
                if build_number == build_number_to:
                    build_to = build
                if build_from and build_to:
                    break
            
            if not build_from:
                raise Exception(f"Build number '{build_number_from}' not found")
            if not build_to:
                raise Exception(f"Build number '{build_number_to}' not found")
            
            # Extract PR IDs from commit messages
            import re
            pr_from_id = None
            pr_to_id = None
            
            for build, pr_var in [(build_from, "pr_from_id"), (build_to, "pr_to_id")]:
                source_version = build.get("sourceVersion")
                if source_version:
                    commit_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/commits/{source_version}"
                    commit_response = await client.get(commit_url, headers=self.headers, params={"api-version": self.api_version})
                    
                    if commit_response.status_code == 200:
                        commit_message = commit_response.json().get("comment", "")
                        pr_match = re.search(r'Merged PR (\d+):', commit_message, re.IGNORECASE)
                        if pr_match:
                            if pr_var == "pr_from_id":
                                pr_from_id = int(pr_match.group(1))
                            else:
                                pr_to_id = int(pr_match.group(1))
            
            if not pr_from_id:
                raise Exception(f"Could not extract PR ID from build {build_number_from}")
            if not pr_to_id:
                raise Exception(f"Could not extract PR ID from build {build_number_to}")
            
            # Get PR details to find merge dates
            pr_from_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/pullrequests/{pr_from_id}"
            pr_to_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/pullrequests/{pr_to_id}"
            
            pr_from_response = await client.get(pr_from_url, headers=self.headers, params={"api-version": self.api_version})
            pr_to_response = await client.get(pr_to_url, headers=self.headers, params={"api-version": self.api_version})
            
            if pr_from_response.status_code != 200 or pr_to_response.status_code != 200:
                raise Exception("Failed to fetch PR details")
            
            pr_from_data = pr_from_response.json()
            pr_to_data = pr_to_response.json()
            
            date_from = pr_from_data.get("closedDate")
            date_to = pr_to_data.get("closedDate")
            
            if not date_from or not date_to:
                raise Exception("One or both PRs are not merged yet")
            
            # Ensure date_from is earlier than date_to
            from datetime import datetime
            dt_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            dt_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            
            if dt_from > dt_to:
                date_from, date_to = date_to, date_from
                pr_from_id, pr_to_id = pr_to_id, pr_from_id
                pr_from_data, pr_to_data = pr_to_data, pr_from_data
            
            # Get all PRs in the repository within this date range
            prs_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests"
            prs_params = {
                "api-version": self.api_version,
                "searchCriteria.status": "completed",
                "$top": 1000
            }
            
            prs_response = await client.get(prs_url, headers=self.headers, params=prs_params)
            if prs_response.status_code != 200:
                raise Exception("Failed to fetch pull requests")
            
            all_prs = prs_response.json().get("value", [])
            
            # Filter PRs by date range and target branch
            prs_in_range = []
            target_ref = f"refs/heads/{target_branch}"
            
            for pr in all_prs:
                pr_target_branch = pr.get("targetRefName", "")
                # Check if target branch matches
                if pr_target_branch != target_ref:
                    continue
                    
                closed_date = pr.get("closedDate")
                if closed_date:
                    pr_dt = datetime.fromisoformat(closed_date.replace('Z', '+00:00'))
                    if dt_from <= pr_dt <= dt_to:
                        # Get work item IDs for this PR
                        pr_id = pr.get("pullRequestId")
                        work_item_ids = []
                        try:
                            wi_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}/workitems"
                            wi_response = await client.get(wi_url, headers=self.headers, params={"api-version": self.api_version})
                            if wi_response.status_code == 200:
                                work_items = wi_response.json().get("value", [])
                                work_item_ids = [wi.get("id") for wi in work_items if wi.get("id")]
                        except:
                            pass
                        
                        prs_in_range.append({
                            "pull_request_id": pr_id,
                            "title": pr.get("title"),
                            "created_by": pr.get("createdBy", {}).get("displayName"),
                            "creation_date": pr.get("creationDate"),
                            "status": pr.get("status"),
                            "source_branch": pr.get("sourceRefName", "").replace("refs/heads/", ""),
                            "target_branch": pr.get("targetRefName", "").replace("refs/heads/", ""),
                            "description": pr.get("description", ""),
                            "work_item_ids": work_item_ids,
                            "url": f"https://dev.azure.com/{self.organization}/{self.project}/_git/{repository_name}/pullrequest/{pr_id}"
                        })
            
            # Sort by creation date (to match other endpoint)
            prs_in_range.sort(key=lambda x: x["creation_date"])
            
            return {
                "repository": repository_name,
                "target_branch": target_branch,
                "build_range": {
                    "from": {
                        "build_number": build_number_from,
                        "pr_id": pr_from_id,
                        "pr_title": pr_from_data.get("title"),
                        "merge_date": date_from
                    },
                    "to": {
                        "build_number": build_number_to,
                        "pr_id": pr_to_id,
                        "pr_title": pr_to_data.get("title"),
                        "merge_date": date_to
                    }
                },
                "total_pull_requests": len(prs_in_range),
                "pull_requests": prs_in_range
            }

    async def get_prs_in_date_range(self, repository_name: str, target_branch: str, start_date: str, end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get all PRs merged within a date range in a repository
        
        This method returns all completed PRs that were merged between start_date and end_date
        targeting the specified branch. If end_date is not provided, it uses the current date.
        
        Args:
            repository_name: Name of the repository
            target_branch: Target branch name to filter PRs
            start_date: Start date in ISO 8601 format (e.g., '2024-12-20T00:00:00Z')
            end_date: End date in ISO 8601 format. If None, uses current date
        
        Returns:
            Dictionary with date range info and list of PRs
        """
        from datetime import datetime, timezone
        
        # Parse start date
        try:
            dt_start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except Exception as e:
            raise Exception(f"Invalid start_date format: {e}")
        
        # Parse or create end date
        if end_date:
            try:
                dt_end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except Exception as e:
                raise Exception(f"Invalid end_date format: {e}")
        else:
            dt_end = datetime.now(timezone.utc)
            end_date = dt_end.isoformat()
        
        # Ensure start is before end
        if dt_start > dt_end:
            raise Exception("start_date must be before end_date")
        
        async with httpx.AsyncClient() as client:
            # Get repository ID
            repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
            repo_params = {"api-version": self.api_version}
            
            repo_response = await client.get(repo_url, headers=self.headers, params=repo_params)
            if repo_response.status_code != 200:
                raise Exception(f"Repository '{repository_name}' not found")
            
            repository_id = repo_response.json().get("id")
            
            # Get all completed PRs in the repository
            prs_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests"
            prs_params = {
                "api-version": self.api_version,
                "searchCriteria.status": "completed",
                "$top": 1000
            }
            
            prs_response = await client.get(prs_url, headers=self.headers, params=prs_params)
            if prs_response.status_code != 200:
                raise Exception("Failed to fetch pull requests")
            
            all_prs = prs_response.json().get("value", [])
            
            # Filter PRs by date range and target branch
            prs_in_range = []
            target_ref = f"refs/heads/{target_branch}"
            
            for pr in all_prs:
                pr_target_branch = pr.get("targetRefName", "")
                # Check if target branch matches
                if pr_target_branch != target_ref:
                    continue
                    
                closed_date = pr.get("closedDate")
                if closed_date:
                    pr_dt = datetime.fromisoformat(closed_date.replace('Z', '+00:00'))
                    if dt_start <= pr_dt <= dt_end:
                        # Get work item IDs for this PR
                        pr_id = pr.get("pullRequestId")
                        work_item_ids = []
                        try:
                            wi_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}/workitems"
                            wi_response = await client.get(wi_url, headers=self.headers, params={"api-version": self.api_version})
                            if wi_response.status_code == 200:
                                work_items = wi_response.json().get("value", [])
                                work_item_ids = [wi.get("id") for wi in work_items if wi.get("id")]
                        except:
                            pass
                        
                        prs_in_range.append({
                            "pull_request_id": pr_id,
                            "title": pr.get("title"),
                            "created_by": pr.get("createdBy", {}).get("displayName"),
                            "creation_date": pr.get("creationDate"),
                            "closed_date": closed_date,
                            "status": pr.get("status"),
                            "source_branch": pr.get("sourceRefName", "").replace("refs/heads/", ""),
                            "target_branch": pr.get("targetRefName", "").replace("refs/heads/", ""),
                            "description": pr.get("description", ""),
                            "work_item_ids": work_item_ids,
                            "url": f"https://dev.azure.com/{self.organization}/{self.project}/_git/{repository_name}/pullrequest/{pr_id}"
                        })
            
            # Sort by closed date
            prs_in_range.sort(key=lambda x: x["closed_date"])
            
            return {
                "repository": repository_name,
                "target_branch": target_branch,
                "date_range": {
                    "start_date": start_date,
                    "end_date": end_date
                },
                "total_pull_requests": len(prs_in_range),
                "pull_requests": prs_in_range
            }

    async def get_completed_prs_by_target_branch(self, repository_name: str, target_branch: str) -> Dict[str, Any]:
        """Get all completed PRs merged into a specific target branch
        
        This method returns all completed PRs where the target branch matches the given branch name.
        
        Args:
            repository_name: Name of the repository
            target_branch: Target branch name (e.g., 'features/vacit/mstr_bk1')
        
        Returns:
            Dictionary with completed PRs merged into the target branch
        """
        async with httpx.AsyncClient() as client:
            # Get repository ID
            repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
            repo_params = {"api-version": self.api_version}
            
            repo_response = await client.get(repo_url, headers=self.headers, params=repo_params)
            if repo_response.status_code != 200:
                raise Exception(f"Repository '{repository_name}' not found")
            
            repository_id = repo_response.json().get("id")
            
            # Get all completed PRs in the repository
            prs_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests"
            prs_params = {
                "api-version": self.api_version,
                "searchCriteria.status": "completed",
                "$top": 1000
            }
            
            prs_response = await client.get(prs_url, headers=self.headers, params=prs_params)
            if prs_response.status_code != 200:
                raise Exception("Failed to fetch pull requests")
            
            all_prs = prs_response.json().get("value", [])
            
            # Filter PRs by target branch
            prs_to_branch = []
            target_ref = f"refs/heads/{target_branch}"
            
            for pr in all_prs:
                pr_target_branch = pr.get("targetRefName", "")
                pr_id = pr.get("pullRequestId")
                
                # Check if target branch matches
                if pr_target_branch == target_ref:
                    # Get work item IDs for this PR
                    pr_id = pr.get("pullRequestId")
                    work_item_ids = []
                    try:
                        wi_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests/{pr_id}/workitems"
                        wi_response = await client.get(wi_url, headers=self.headers, params={"api-version": self.api_version})
                        if wi_response.status_code == 200:
                            work_items = wi_response.json().get("value", [])
                            work_item_ids = [wi.get("id") for wi in work_items if wi.get("id")]
                    except:
                        pass
                    
                    prs_to_branch.append({
                        "pull_request_id": pr_id,
                        "title": pr.get("title"),
                        "created_by": pr.get("createdBy", {}).get("displayName"),
                        "creation_date": pr.get("creationDate"),
                        "closed_date": pr.get("closedDate"),
                        "status": pr.get("status"),
                        "source_branch": pr.get("sourceRefName", "").replace("refs/heads/", ""),
                        "target_branch": pr.get("targetRefName", "").replace("refs/heads/", ""),
                        "description": pr.get("description", ""),
                        "work_item_ids": work_item_ids,
                        "url": f"https://dev.azure.com/{self.organization}/{self.project}/_git/{repository_name}/pullrequest/{pr_id}"
                    })
            
            # Sort by closed date (most recent first)
            prs_to_branch.sort(key=lambda x: x["closed_date"] if x["closed_date"] else "", reverse=True)
            
            return {
                "repository": repository_name,
                "target_branch": target_branch,
                "total_pull_requests": len(prs_to_branch),
                "pull_requests": prs_to_branch
            }

    async def preview_code_sync_merge(
        self, 
        repository_name: str, 
        source_branch: str, 
        target_branch: str, 
        pr_ids: List[int]
    ) -> Dict[str, Any]:
        """Preview code sync merge by testing merge without committing
        
        This method simulates merging specific PRs from source to target branch using git operations.
        It detects conflicts, calculates changes, and provides risk assessment.
        
        Args:
            repository_name: Name of the repository
            source_branch: Source branch (your master)
            target_branch: Target branch (customer branch)
            pr_ids: List of PR IDs to merge
        
        Returns:
            Dictionary with merge preview information
        """
        import tempfile
        import subprocess
        import shutil
        from pathlib import Path
        
        temp_dir = None
        
        try:
            async with httpx.AsyncClient() as client:
                # Get repository details
                repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
                repo_response = await client.get(repo_url, headers=self.headers, params={"api-version": self.api_version})
                if repo_response.status_code != 200:
                    raise Exception(f"Repository '{repository_name}' not found")
                
                repo_data = repo_response.json()
                clone_url = repo_data.get("remoteUrl")
                
                # Get commit SHAs from PR IDs
                commit_shas = []
                pr_details = []
                
                for pr_id in pr_ids:
                    pr_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/pullrequests/{pr_id}"
                    pr_response = await client.get(pr_url, headers=self.headers, params={"api-version": self.api_version})
                    
                    if pr_response.status_code == 200:
                        pr_data = pr_response.json()
                        
                        # Try to get the source commit (the changes in the PR)
                        # For completed PRs, use lastMergeSourceCommit (the commit that was merged)
                        # This represents the state of the source branch at merge time
                        last_merge_source = pr_data.get("lastMergeSourceCommit", {})
                        commit_id = last_merge_source.get("commitId")
                        
                        # If not available, try lastMergeCommit (for completed PRs)
                        if not commit_id:
                            last_merge_commit = pr_data.get("lastMergeCommit", {})
                            commit_id = last_merge_commit.get("commitId")
                        
                        if commit_id:
                            commit_shas.append(commit_id)
                            pr_details.append({
                                "pr_id": pr_id,
                                "title": pr_data.get("title"),
                                "commit_sha": commit_id,
                                "source_branch": pr_data.get("sourceRefName", "").replace("refs/heads/", ""),
                                "target_branch": pr_data.get("targetRefName", "").replace("refs/heads/", "")
                            })
                        else:
                            # If still no commit, add to details with error
                            pr_details.append({
                                "pr_id": pr_id,
                                "title": pr_data.get("title"),
                                "commit_sha": None,
                                "error": "No commit SHA found"
                            })
                
                if not commit_shas:
                    return {
                        "status": "error",
                        "message": "No valid commits found for the given PR IDs",
                        "can_merge": False,
                        "files_to_change": [],
                        "potential_conflicts": [],
                        "risk_level": "none",
                        "statistics": {},
                        "preview_summary": "No changes to preview"
                    }
                
                # Create temporary directory
                temp_dir = tempfile.mkdtemp(prefix="code_sync_preview_")
                repo_path = Path(temp_dir) / "repo"
                
                # Clone repository with PAT authentication
                # Azure DevOps URL format: https://dev.azure.com/{org}/{project}/_git/{repo}
                # We need to inject PAT before dev.azure.com
                if "@dev.azure.com" in clone_url:
                    # URL already has a username, remove it
                    clone_url = clone_url.split("@dev.azure.com")[1]
                    clone_url = "https://dev.azure.com" + clone_url
                
                # Add PAT to URL
                clone_url_with_auth = clone_url.replace("https://", f"https://{self.pat}@")
                
                # Clone only necessary branches (shallow clone for speed)
                clone_result = subprocess.run(
                    ["git", "clone", "--depth", "1", "--single-branch", "--branch", target_branch, clone_url_with_auth, str(repo_path)],
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                
                if clone_result.returncode != 0:
                    error_msg = clone_result.stderr or clone_result.stdout
                    raise Exception(f"Git clone failed: {error_msg}")
                
                # Fetch source branch
                fetch_result = subprocess.run(
                    ["git", "fetch", "origin", f"{source_branch}:{source_branch}"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                if fetch_result.returncode != 0:
                    error_msg = fetch_result.stderr or fetch_result.stdout
                    raise Exception(f"Git fetch failed: {error_msg}")
                
                # Checkout target branch
                subprocess.run(
                    ["git", "checkout", target_branch],
                    cwd=repo_path,
                    check=True,
                    capture_output=True,
                    text=True
                )
                
                # Try to merge commits (without committing)
                files_to_change = []
                potential_conflicts = []
                can_merge = True
                
                for commit_sha in commit_shas:
                    try:
                        # Cherry-pick or merge the commit
                        result = subprocess.run(
                            ["git", "cherry-pick", "--no-commit", commit_sha],
                            cwd=repo_path,
                            capture_output=True,
                            text=True
                        )
                        
                        if result.returncode != 0:
                            # Check for conflicts
                            can_merge = False
                            
                            # Get conflicted files
                            conflict_result = subprocess.run(
                                ["git", "diff", "--name-only", "--diff-filter=U"],
                                cwd=repo_path,
                                capture_output=True,
                                text=True,
                                check=True
                            )
                            
                            conflict_files = conflict_result.stdout.strip().split("\n")
                            for file in conflict_files:
                                if file:
                                    potential_conflicts.append({
                                        "file": file,
                                        "commit_sha": commit_sha
                                    })
                    except Exception as e:
                        can_merge = False
                        potential_conflicts.append({
                            "error": str(e),
                            "commit_sha": commit_sha
                        })
                
                # Get staged changes
                diff_result = subprocess.run(
                    ["git", "diff", "--cached", "--stat"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                # Get list of changed files
                files_result = subprocess.run(
                    ["git", "diff", "--cached", "--name-status"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                for line in files_result.stdout.strip().split("\n"):
                    if line:
                        parts = line.split("\t", 1)
                        if len(parts) == 2:
                            status, file_path = parts
                            files_to_change.append({
                                "file": file_path,
                                "status": status  # M=modified, A=added, D=deleted
                            })
                
                # Get statistics
                stat_lines = diff_result.stdout.strip().split("\n")
                total_files = len(files_to_change)
                additions = 0
                deletions = 0
                
                for line in stat_lines:
                    if "insertion" in line or "deletion" in line:
                        parts = line.split(",")
                        for part in parts:
                            if "insertion" in part:
                                additions = int(part.split()[0])
                            if "deletion" in part:
                                deletions = int(part.split()[0])
                
                # Abort merge
                subprocess.run(
                    ["git", "cherry-pick", "--abort"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                # Calculate risk level
                conflict_count = len(potential_conflicts)
                if not can_merge or conflict_count > 0:
                    risk_level = "high"
                elif total_files > 20:
                    risk_level = "medium"
                elif total_files > 5:
                    risk_level = "low"
                else:
                    risk_level = "low"
                
                preview_summary = f"{len(pr_ids)} PR, {total_files} files, {additions}+ / {deletions}-"
                if conflict_count > 0:
                    preview_summary += f" | {conflict_count} conflicts"
                
                return {
                    "status": "success",
                    "can_merge": can_merge,
                    "files_to_change": files_to_change,
                    "potential_conflicts": potential_conflicts,
                    "risk_level": risk_level,
                    "statistics": {
                        "total_files": total_files,
                        "additions": additions,
                        "deletions": deletions,
                        "total_prs": len(pr_ids),
                        "conflict_count": conflict_count
                    },
                    "preview_summary": preview_summary,
                    "pr_details": pr_details
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "error",
                "message": "Git operation timed out",
                "can_merge": False,
                "files_to_change": [],
                "potential_conflicts": [],
                "risk_level": "unknown",
                "statistics": {},
                "preview_summary": "Timeout occurred"
            }
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "can_merge": False,
                "files_to_change": [],
                "potential_conflicts": [],
                "risk_level": "unknown",
                "statistics": {},
                "preview_summary": f"Error: {str(e)}"
            }
        finally:
            # Cleanup temporary directory
            if temp_dir and Path(temp_dir).exists():
                try:
                    shutil.rmtree(temp_dir)
                except:
                    pass

    async def execute_code_sync(
        self, 
        repository_name: str, 
        source_branch: str, 
        target_branch: str, 
        pr_ids: List[int],
        auto_resolve_conflicts: bool = False,
        sync_branch_prefix: str = "sync"
    ) -> Dict[str, Any]:
        """Execute code sync by creating sync branch, merging PRs, and creating PR
        
        This method:
        1. Creates a sync branch from target branch
        2. Merges specified PR commits
        3. Handles conflicts (with optional AI resolution)
        4. Pushes sync branch
        5. Creates a PR for review
        
        Args:
            repository_name: Name of the repository
            source_branch: Source branch (your master)
            target_branch: Target branch (customer branch)
            pr_ids: List of PR IDs to sync
            auto_resolve_conflicts: Use AI to resolve conflicts
            sync_branch_prefix: Prefix for sync branch name
        
        Returns:
            Dictionary with sync execution results
        """
        import tempfile
        import subprocess
        import shutil
        from pathlib import Path
        from datetime import datetime
        
        temp_dir = None
        
        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                # Get repository details
                repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
                repo_response = await client.get(repo_url, headers=self.headers, params={"api-version": self.api_version})
                if repo_response.status_code != 200:
                    raise Exception(f"Repository '{repository_name}' not found")
                
                repo_data = repo_response.json()
                repository_id = repo_data.get("id")
                clone_url = repo_data.get("remoteUrl")
                
                # Get commit SHAs from PR IDs
                commit_shas = []
                merged_prs = []
                
                for pr_id in pr_ids:
                    pr_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/pullrequests/{pr_id}"
                    pr_response = await client.get(pr_url, headers=self.headers, params={"api-version": self.api_version})
                    
                    if pr_response.status_code == 200:
                        pr_data = pr_response.json()
                        
                        # Get source commit
                        last_merge_source = pr_data.get("lastMergeSourceCommit", {})
                        commit_id = last_merge_source.get("commitId")
                        
                        if not commit_id:
                            last_merge_commit = pr_data.get("lastMergeCommit", {})
                            commit_id = last_merge_commit.get("commitId")
                        
                        if commit_id:
                            commit_shas.append(commit_id)
                            merged_prs.append({
                                "pr_id": pr_id,
                                "commit_ids": [commit_id],
                                "title": pr_data.get("title")
                            })
                
                if not commit_shas:
                    return {
                        "status": "failed",
                        "message": "No valid commits found for the given PR IDs",
                        "sync_branch_name": None,
                        "merge_commit_id": None,
                        "pr_created": None,
                        "conflicts": [],
                        "merged_prs": []
                    }
                
                # Create temporary directory
                temp_dir = tempfile.mkdtemp(prefix="code_sync_execute_")
                repo_path = Path(temp_dir) / "repo"
                
                # Fix clone URL
                if "@dev.azure.com" in clone_url:
                    clone_url = clone_url.split("@dev.azure.com")[1]
                    clone_url = "https://dev.azure.com" + clone_url
                
                clone_url_with_auth = clone_url.replace("https://", f"https://{self.pat}@")
                
                # Prepare git environment with credentials
                git_env = {
                    **os.environ,
                    "GIT_TERMINAL_PROMPT": "0",  # Disable interactive prompts
                    "GIT_ASKPASS": "echo",  # Prevent password prompts
                    "GIT_USERNAME": self.pat,
                    "GIT_PASSWORD": self.pat,
                    "GIT_EDITOR": "true"  # Disable git editor (prevents hanging on commit messages)
                }
                
                # Clone repository - don't use shallow clone to get all branches
                clone_result = subprocess.run(
                    ["git", "clone", clone_url_with_auth, str(repo_path)],
                    capture_output=True,
                    text=True,
                    timeout=300,
                    env=git_env
                )
                
                if clone_result.returncode != 0:
                    raise Exception(f"Git clone failed: {clone_result.stderr}")
                
                # Configure git with credential store
                subprocess.run(["git", "config", "user.email", "code-sync@automation.com"], cwd=repo_path, check=True)
                subprocess.run(["git", "config", "user.name", "Code Sync Bot"], cwd=repo_path, check=True)
                subprocess.run(["git", "config", "credential.helper", "store"], cwd=repo_path, check=True)
                
                # Fetch specific target branch with full history
                fetch_target_result = subprocess.run(
                    ["git", "fetch", "origin", f"refs/heads/{target_branch}:refs/remotes/origin/{target_branch}"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    timeout=120
                )
                
                # List remote branches to debug
                list_remote_result = subprocess.run(
                    ["git", "branch", "-r"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                remote_branches = list_remote_result.stdout
                target_branch_ref = f"origin/{target_branch}"
                
                if target_branch_ref not in remote_branches:
                    raise Exception(f"Target branch '{target_branch}' not found in remote after fetch. Available branches: {remote_branches}")

                
                # Checkout target branch
                checkout_result = subprocess.run(
                    ["git", "checkout", "-b", target_branch, target_branch_ref],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                
                if checkout_result.returncode != 0:
                    # Maybe branch already exists locally, just checkout
                    checkout_result = subprocess.run(
                        ["git", "checkout", target_branch],
                        cwd=repo_path,
                        capture_output=True,
                        text=True
                    )
                    if checkout_result.returncode != 0:
                        raise Exception(f"Failed to checkout target branch '{target_branch}': {checkout_result.stderr}")

                
                # Create sync branch name with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                sync_branch_name = f"{target_branch}_{sync_branch_prefix}_{timestamp}"
                
                # Create and checkout sync branch
                subprocess.run(["git", "checkout", "-b", sync_branch_name], cwd=repo_path, check=True, capture_output=True)
                
                # Fetch commits we need
                for commit_sha in commit_shas:
                    subprocess.run(
                        ["git", "fetch", "origin", commit_sha],
                        cwd=repo_path,
                        capture_output=True,
                        timeout=120
                    )
                
                # Merge commits
                conflicts = []
                merge_commit_id = None
                has_conflicts = False
                
                for commit_sha in commit_shas:
                    result = subprocess.run(
                        ["git", "cherry-pick", commit_sha],
                        cwd=repo_path,
                        capture_output=True,
                        text=True
                    )
                    
                    if result.returncode != 0:
                        has_conflicts = True
                        
                        # Get conflicted files
                        conflict_result = subprocess.run(
                            ["git", "diff", "--name-only", "--diff-filter=U"],
                            cwd=repo_path,
                            capture_output=True,
                            text=True
                        )
                        
                        conflict_files = [f for f in conflict_result.stdout.strip().split("\n") if f]
                        
                        for file in conflict_files:
                            conflict_info = {
                                "file": file,
                                "status": "pending",
                                "commit_sha": commit_sha
                            }
                            
                            # Get conflict content
                            full_content = None
                            try:
                                with open(repo_path / file, 'r') as f:
                                    full_content = f.read()
                                    conflict_info["conflict_markers"] = "<<<<<<< HEAD" in full_content
                                    
                                    # Parse ours and theirs
                                    if "<<<<<<< HEAD" in full_content:
                                        parts = full_content.split("<<<<<<< HEAD")
                                        for part in parts[1:]:
                                            if "=======" in part and ">>>>>>>" in part:
                                                ours_theirs = part.split("=======")
                                                ours = ours_theirs[0].strip()
                                                theirs = ours_theirs[1].split(">>>>>>>")[0].strip()
                                                conflict_info["ours"] = ours[:1000]
                                                conflict_info["theirs"] = theirs[:1000]
                                                conflict_info["full_content"] = full_content
                                                break
                            except Exception as e:
                                conflict_info["error"] = str(e)
                            
                            conflicts.append(conflict_info)
                        
                        if not auto_resolve_conflicts:
                            # Abort and return conflict status
                            subprocess.run(["git", "cherry-pick", "--abort"], cwd=repo_path, capture_output=True, env=git_env)
                            
                            return {
                                "status": "conflict",
                                "message": f"Conflicts detected in {len(conflicts)} files",
                                "sync_branch_name": sync_branch_name,
                                "merge_commit_id": None,
                                "pr_created": None,
                                "conflicts": conflicts,
                                "merged_prs": merged_prs,
                                "next_action": "resolve_manually"
                            }
                        else:
                            # AI conflict resolution using Azure OpenAI
                            # Initialize OpenAI client (same pattern as LLMCodeAnalyzer)
                            azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
                            openai_key = os.getenv("OPENAI_API_KEY")
                            
                            if not azure_endpoint and not openai_key:
                                subprocess.run(["git", "cherry-pick", "--abort"], cwd=repo_path, capture_output=True, env=git_env)
                                return {
                                    "status": "conflict",
                                    "message": "AI conflict resolution requested but no OpenAI configuration found. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY or OPENAI_API_KEY",
                                    "sync_branch_name": sync_branch_name,
                                    "merge_commit_id": None,
                                    "pr_created": None,
                                    "conflicts": conflicts,
                                    "merged_prs": merged_prs,
                                    "next_action": "resolve_manually"
                                }
                            
                            # Initialize OpenAI client (same pattern as LLMCodeAnalyzer)
                            from openai import OpenAI, AzureOpenAI
                            
                            if azure_endpoint:
                                # Use Azure OpenAI
                                # Note: For APIM, the endpoint should not include /openai at the end
                                # The client will append /deployments/{deployment-name}/chat/completions
                                print(f"🤖 Initializing Azure OpenAI client...")
                                print(f"   Endpoint: {azure_endpoint}")
                                
                                api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-03-01-preview")
                                api_key = os.getenv("AZURE_OPENAI_API_KEY")
                                
                                ai_client = AzureOpenAI(
                                    api_key=api_key,
                                    api_version=api_version,
                                    azure_endpoint=azure_endpoint,
                                    # For APIM, we need custom headers
                                    default_headers={"api-key": api_key}
                                )
                                model_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
                                provider = "azure"
                                print(f"   Model/Deployment: {model_name}")
                                print(f"   API Version: {api_version}")
                                print(f"   API Key (first 10 chars): {api_key[:10]}..." if api_key else "   API Key: NOT SET")
                                print(f"✅ Azure OpenAI client initialized")
                            else:
                                # Use OpenAI
                                print(f"🤖 Initializing OpenAI client...")
                                ai_client = OpenAI(api_key=openai_key)
                                model_name = os.getenv("OPENAI_MODEL", "gpt-4o")
                                provider = "openai"
                                print(f"   Model: {model_name}")
                                print(f"✅ OpenAI client initialized")
                            
                            print(f"\n🔧 AI Conflict Resolution Started")
                            print(f"   Total conflicts to resolve: {len(conflicts)}")
                            resolved_count = 0
                            
                            for idx, conflict in enumerate(conflicts, 1):
                                if "full_content" not in conflict:
                                    conflict["status"] = "skipped"
                                    conflict["error"] = "No full content available"
                                    print(f"   ⚠️  Conflict {idx}/{len(conflicts)}: {conflict['file']} - SKIPPED (no content)")
                                    continue
                                
                                file_path = conflict["file"]
                                full_content = conflict["full_content"]
                                
                                print(f"\n   📝 Conflict {idx}/{len(conflicts)}: {file_path}")
                                print(f"      Content size: {len(full_content)} chars")
                                print(f"      Calling AI for resolution...")
                                
                                # Use AI to resolve conflict
                                try:
                                    # Prepare prompt for AI
                                    prompt = f"""You are a code merge conflict resolver. Below is a file with Git merge conflicts.
Your task is to resolve the conflicts by choosing the best option or merging both changes intelligently.

File: {file_path}

Content with conflicts:
```
{full_content[:5000]}
```

Instructions:
1. Analyze the conflict markers (<<<<<<< HEAD, =======, >>>>>>>)
2. Understand what each side is trying to do
3. Resolve by either:
   - Keeping one side if it's clearly better
   - Merging both changes if they don't conflict semantically
   - Creating a combination that preserves both intents

Return ONLY the resolved file content WITHOUT any conflict markers or explanations.
"""
                                    
                                    print(f"      📤 Calling AI API...")
                                    print(f"         Provider: {provider}")
                                    print(f"         Model: {model_name}")
                                    if provider == "azure":
                                        print(f"         Endpoint: {azure_endpoint}")
                                        print(f"         Full URL: {azure_endpoint}/deployments/{model_name}/chat/completions?api-version={api_version}")
                                        print(f"         Headers: api-key={api_key[:10]}...")
                                    
                                    # Prepare request body (SDK will construct this)
                                    request_body = {
                                        "messages": [
                                            {"role": "system", "content": "You are an expert code merge conflict resolver. Return only the resolved code without any explanations."},
                                            {"role": "user", "content": prompt}
                                        ],
                                        "max_tokens": 16384,
                                        "temperature": 1,
                                        "top_p": 1
                                    }
                                    print(f"      📦 Request body (SDK will send):")
                                    print(f"         Messages: {len(request_body['messages'])} messages")
                                    print(f"         Max tokens: {request_body['max_tokens']}")
                                    print(f"         Temperature: {request_body['temperature']}")
                                    print(f"         Top P: {request_body['top_p']}")
                                    
                                    response = ai_client.chat.completions.create(
                                        model=model_name,
                                        messages=request_body["messages"],
                                        max_tokens=request_body["max_tokens"],
                                        temperature=request_body["temperature"],
                                        top_p=request_body["top_p"]
                                    )
                                    
                                    print(f"      ✅ AI response received")
                                    resolved_content = response.choices[0].message.content
                                    print(f"      Resolved content size: {len(resolved_content)} chars")
                                    
                                    # Remove markdown code blocks if present
                                    if "```" in resolved_content:
                                        lines = resolved_content.split("\n")
                                        resolved_lines = []
                                        in_code_block = False
                                        for line in lines:
                                            if line.strip().startswith("```"):
                                                in_code_block = not in_code_block
                                                continue
                                            if not in_code_block or in_code_block:
                                                resolved_lines.append(line)
                                        resolved_content = "\n".join(resolved_lines)
                                    
                                    # Write resolved content back
                                    with open(repo_path / file_path, 'w') as f:
                                        f.write(resolved_content)
                                    print(f"      💾 File written: {file_path}")
                                    
                                    # Stage the resolved file
                                    subprocess.run(
                                        ["git", "add", file_path],
                                        cwd=repo_path,
                                        check=True,
                                        env=git_env
                                    )
                                    print(f"      ✅ File staged in git")
                                    
                                    conflict["status"] = "resolved"
                                    conflict["ai_suggestion"] = resolved_content[:500]
                                    resolved_count += 1
                                    print(f"      🎉 Conflict RESOLVED! ({resolved_count}/{len(conflicts)})")
                                    
                                except Exception as e:
                                    conflict["status"] = "failed"
                                    error_msg = str(e)
                                    conflict["error"] = f"AI resolution failed: {error_msg}"
                                    print(f"      ❌ AI resolution FAILED!")
                                    print(f"         Error type: {type(e).__name__}")
                                    print(f"         Error message: {error_msg}")
                                    
                                    # Log detailed error for common issues
                                    if "Connection" in error_msg or "connection" in error_msg:
                                        print(f"         🔍 CONNECTION ERROR - Possible causes:")
                                        print(f"            1. Endpoint URL incorrect: {azure_endpoint}")
                                        print(f"            2. Network/firewall blocking request")
                                        print(f"            3. APIM configuration issue")
                                        print(f"            4. SSL/TLS certificate problem")
                                    elif "401" in error_msg or "Unauthorized" in error_msg:
                                        print(f"         🔍 AUTHENTICATION ERROR:")
                                        print(f"            API key may be invalid or expired")
                                        print(f"            Check AZURE_OPENAI_API_KEY environment variable")
                                    elif "404" in error_msg or "Not Found" in error_msg:
                                        print(f"         🔍 NOT FOUND ERROR:")
                                        print(f"            Deployment '{model_name}' may not exist")
                                        print(f"            Check AZURE_OPENAI_DEPLOYMENT environment variable")
                                    elif "timeout" in error_msg.lower():
                                        print(f"         🔍 TIMEOUT ERROR:")
                                        print(f"            Request took too long, server may be overloaded")
                                    
                                    # Show full exception details for debugging
                                    import traceback
                                    print(f"         📋 Full traceback:")
                                    traceback.print_exc()
                            
                            print(f"\n📊 AI Conflict Resolution Summary:")
                            print(f"   Total conflicts: {len(conflicts)}")
                            print(f"   Resolved: {resolved_count}")
                            print(f"   Failed: {len(conflicts) - resolved_count}")
                            
                            if resolved_count == len(conflicts):
                                print(f"\n✅ All conflicts resolved! Continuing cherry-pick...")
                                # All conflicts resolved, continue with cherry-pick
                                print(f"   🔄 Running: git cherry-pick --continue --no-edit")
                                continue_result = subprocess.run(
                                    ["git", "cherry-pick", "--continue", "--no-edit"],
                                    cwd=repo_path,
                                    capture_output=True,
                                    text=True,
                                    env=git_env
                                )
                                
                                print(f"   📝 Git output: {continue_result.stdout[:200]}")
                                if continue_result.stderr:
                                    print(f"   ⚠️  Git stderr: {continue_result.stderr[:200]}")
                                
                                if continue_result.returncode != 0:
                                    print(f"   ❌ Cherry-pick continue FAILED!")
                                    print(f"      Return code: {continue_result.returncode}")
                                    print(f"      Full stderr: {continue_result.stderr}")
                                    subprocess.run(["git", "cherry-pick", "--abort"], cwd=repo_path, capture_output=True, env=git_env)
                                    return {
                                        "status": "conflict",
                                        "message": f"AI resolved conflicts but cherry-pick failed: {continue_result.stderr}",
                                        "sync_branch_name": sync_branch_name,
                                        "merge_commit_id": None,
                                        "pr_created": None,
                                        "conflicts": conflicts,
                                        "merged_prs": merged_prs,
                                        "next_action": "ai_failed"
                                    }
                                else:
                                    print(f"   ✅ Cherry-pick continued successfully!")
                                    print(f"   📍 Moving to next commit (if any)...")
                            else:
                                # Some conflicts couldn't be resolved
                                subprocess.run(["git", "cherry-pick", "--abort"], cwd=repo_path, capture_output=True, env=git_env)
                                return {
                                    "status": "conflict",
                                    "message": f"AI resolved {resolved_count}/{len(conflicts)} conflicts",
                                    "sync_branch_name": sync_branch_name,
                                    "merge_commit_id": None,
                                    "pr_created": None,
                                    "conflicts": conflicts,
                                    "merged_prs": merged_prs,
                                    "next_action": "partially_resolved"
                                }
                
                # Get merge commit ID
                print(f"\n📍 All commits cherry-picked successfully!")
                print(f"   🔍 Getting final commit ID...")
                commit_result = subprocess.run(
                    ["git", "rev-parse", "HEAD"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    check=True,
                    env=git_env
                )
                merge_commit_id = commit_result.stdout.strip()
                print(f"   ✅ Final commit ID: {merge_commit_id[:12]}...")
                
                # Set remote URL with PAT for push
                print(f"\n🔗 Preparing to push sync branch...")
                print(f"   🔄 Setting remote URL with authentication...")
                subprocess.run(
                    ["git", "remote", "set-url", "origin", clone_url_with_auth],
                    cwd=repo_path,
                    check=True,
                    capture_output=True,
                    env=git_env
                )
                print(f"   ✅ Remote URL updated")
                
                # Push sync branch with authentication
                print(f"\n⬆️  Pushing sync branch: {sync_branch_name}")
                print(f"   🔄 Running: git push -u origin {sync_branch_name}")
                push_result = subprocess.run(
                    ["git", "push", "-u", "origin", sync_branch_name],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    timeout=180,
                    env=git_env
                )
                
                print(f"   📝 Push output: {push_result.stdout[:200]}")
                if push_result.stderr:
                    print(f"   📝 Push stderr: {push_result.stderr[:200]}")
                
                if push_result.returncode != 0:
                    print(f"   ❌ Push FAILED!")
                    print(f"      Return code: {push_result.returncode}")
                    print(f"      Full stderr: {push_result.stderr}")
                    raise Exception(f"Failed to push sync branch: {push_result.stderr}")
                
                print(f"   ✅ Branch pushed successfully!")
                
                # Create PR
                print(f"\n🔀 Creating Pull Request...")
                pr_title = f"Code Sync: {len(pr_ids)} PR merged"
                pr_description = f"Automated code sync from {source_branch} to {target_branch}\n\nMerged PRs:\n"
                for pr_info in merged_prs:
                    pr_description += f"- PR #{pr_info['pr_id']}: {pr_info['title']}\n"
                
                print(f"   📋 PR Title: {pr_title}")
                print(f"   📋 Source: {sync_branch_name}")
                print(f"   📋 Target: {target_branch}")
                
                pr_data = {
                    "sourceRefName": f"refs/heads/{sync_branch_name}",
                    "targetRefName": f"refs/heads/{target_branch}",
                    "title": pr_title,
                    "description": pr_description
                }
                
                create_pr_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests"
                print(f"   🔄 Calling Azure DevOps API to create PR...")
                pr_response = await client.post(
                    create_pr_url,
                    headers=self.headers,
                    params={"api-version": self.api_version},
                    json=pr_data
                )
                
                if pr_response.status_code != 201:
                    print(f"   ❌ PR creation FAILED!")
                    print(f"      Status code: {pr_response.status_code}")
                    print(f"      Response: {pr_response.text[:500]}")
                    raise Exception(f"Failed to create PR: {pr_response.text}")
                
                pr_result = pr_response.json()
                pr_id = pr_result.get("pullRequestId")
                pr_url = f"https://dev.azure.com/{self.organization}/{self.project}/_git/{repository_name}/pullrequest/{pr_id}"
                
                print(f"   ✅ PR created successfully!")
                print(f"   🔗 PR ID: {pr_id}")
                print(f"   🔗 PR URL: {pr_url}")
                
                created_pr = {
                    "pr_id": pr_id,
                    "pr_url": pr_url,
                    "title": pr_title,
                    "source_branch": sync_branch_name,
                    "target_branch": target_branch
                }
                
                print(f"\n🎉 Code sync completed successfully!")
                print(f"   ✅ Synced {len(pr_ids)} PRs")
                print(f"   ✅ Resolved {len(conflicts)} conflicts using AI")
                print(f"   ✅ Created PR #{pr_id}")
                
                return {
                    "status": "success",
                    "message": f"Successfully synced {len(pr_ids)} PRs",
                    "sync_branch_name": sync_branch_name,
                    "merge_commit_id": merge_commit_id,
                    "pr_created": created_pr,
                    "conflicts": conflicts,
                    "merged_prs": merged_prs
                }
                
        except subprocess.TimeoutExpired:
            return {
                "status": "failed",
                "message": "Git operation timed out",
                "sync_branch_name": None,
                "merge_commit_id": None,
                "pr_created": None,
                "conflicts": [],
                "merged_prs": []
            }
        except Exception as e:
            return {
                "status": "failed",
                "message": str(e),
                "sync_branch_name": None,
                "merge_commit_id": None,
                "pr_created": None,
                "conflicts": [],
                "merged_prs": []
            }
        finally:
            # Cleanup temporary directory
            if temp_dir and Path(temp_dir).exists():
                try:
                    shutil.rmtree(temp_dir)
                except:
                    pass

    async def get_release_definitions(self, organization: str, project: str) -> List[Dict[str, Any]]:
        """Get all release definitions for a project
        
        Args:
            organization: Azure DevOps organization name
            project: Azure DevOps project name
        
        Returns:
            List of release definitions
        """
        url = f"https://vsrm.dev.azure.com/{organization}/{project}/_apis/release/definitions"
        params = {"api-version": "7.1-preview.4"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            definitions = []
            for definition in data.get("value", []):
                definitions.append({
                    "id": definition.get("id"),
                    "name": definition.get("name"),
                    "description": definition.get("description"),
                    "created_on": definition.get("createdOn"),
                    "created_by": definition.get("createdBy", {}).get("displayName"),
                    "url": definition.get("url")
                })
            
            return definitions

    async def get_releases_for_definition(
        self, 
        organization: str, 
        project: str, 
        definition_id: int,
        top: int = 50
    ) -> List[Dict[str, Any]]:
        """Get releases for a specific release definition
        
        Args:
            organization: Azure DevOps organization name
            project: Azure DevOps project name
            definition_id: Release definition ID
            top: Maximum number of releases to return (default: 50)
        
        Returns:
            List of releases with their details
        """
        url = f"https://vsrm.dev.azure.com/{organization}/{project}/_apis/release/releases"
        params = {
            "definitionId": definition_id,
            "$top": top,
            "$expand": "environments",
            "api-version": "7.1-preview.8"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            releases = []
            for release in data.get("value", []):
                # Parse stages (environments)
                stages = []
                for env in release.get("environments", []):
                    stages.append({
                        "id": env.get("id"),
                        "name": env.get("name"),
                        "status": env.get("status"),
                        "rank": env.get("rank", 0)
                    })
                
                # Get build information
                build_number = None
                for artifact in release.get("artifacts", []):
                    if artifact.get("type") == "Build":
                        build_number = artifact.get("definitionReference", {}).get("version", {}).get("name")
                        break
                
                releases.append({
                    "id": release.get("id"),
                    "name": release.get("name"),
                    "status": release.get("status"),
                    "created_on": release.get("createdOn"),
                    "created_by": release.get("createdBy", {}).get("displayName"),
                    "release_definition_id": definition_id,
                    "release_definition_name": release.get("releaseDefinition", {}).get("name"),
                    "build_number": build_number,
                    "stages": stages,
                    "url": release.get("_links", {}).get("web", {}).get("href")
                })
            
            return releases
    
    async def get_conflict_history(
        self,
        repository_name: str,
        branch: Optional[str] = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Get PRs that had merge conflicts and how they were resolved
        
        This method finds completed PRs where conflicts occurred during merge
        and shows the conflict resolution commits.
        
        Args:
            repository_name: Name of the repository
            branch: Target branch to search PRs for (default: repository's default branch)
            limit: Maximum number of PRs to return
        
        Returns:
            Dictionary with PRs that had conflicts and their resolution details
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Get repository details
            repo_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_name}"
            repo_response = await client.get(repo_url, headers=self.headers, params={"api-version": self.api_version})
            if repo_response.status_code != 200:
                raise Exception(f"Repository '{repository_name}' not found")
            
            repo_data = repo_response.json()
            repository_id = repo_data.get("id")
            default_branch = repo_data.get("defaultBranch", "refs/heads/main").replace("refs/heads/", "")
            
            if not branch:
                branch = default_branch
            
            target_ref = f"refs/heads/{branch}"
            
            # Get completed PRs for this branch
            prs_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullrequests"
            prs_params = {
                "api-version": self.api_version,
                "searchCriteria.status": "completed",
                "searchCriteria.targetRefName": target_ref,
                "$top": 100  # Get more PRs to analyze
            }
            
            prs_response = await client.get(prs_url, headers=self.headers, params=prs_params)
            if prs_response.status_code != 200:
                raise Exception("Failed to fetch pull requests")
            
            all_prs = prs_response.json().get("value", [])
            
            conflict_prs = []
            
            for pr in all_prs:
                pr_id = pr.get("pullRequestId")
                merge_status = pr.get("mergeStatus", "")
                
                # METHOD 1: Check if PR has/had conflicts via status history
                # Get PR status updates to see if it ever had conflicts
                had_conflicts = False
                
                # Get PR iterations - multiple iterations often indicate conflict resolution
                iterations_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullRequests/{pr_id}/iterations"
                iterations_response = await client.get(iterations_url, headers=self.headers, params={"api-version": self.api_version})
                
                iteration_count = 0
                iteration_details = []
                
                if iterations_response.status_code == 200:
                    iterations = iterations_response.json().get("value", [])
                    iteration_count = len(iterations)
                    
                    for iteration in iterations:
                        iteration_details.append({
                            "id": iteration.get("id"),
                            "reason": iteration.get("reason"),
                            "created_date": iteration.get("createdDate")
                        })
                
                # Check PR threads for Azure system-generated conflict warnings
                threads_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullRequests/{pr_id}/threads"
                threads_response = await client.get(threads_url, headers=self.headers, params={"api-version": self.api_version})
                
                conflict_files = []
                
                if threads_response.status_code == 200:
                    threads = threads_response.json().get("value", [])
                    for thread in threads:
                        # Check thread status - Azure creates threads with specific statuses for conflicts
                        thread_status = thread.get("status")
                        
                        # Look for system comments about conflicts
                        for comment in thread.get("comments", []):
                            comment_type = comment.get("commentType", "")
                            content = comment.get("content", "")
                            
                            # System-generated conflict messages
                            if comment_type == "system" and ("conflict" in content.lower() or "merge conflict" in content.lower()):
                                had_conflicts = True
                                thread_context = thread.get("threadContext", {})
                                file_path = thread_context.get("filePath", "unknown")
                                
                                conflict_files.append({
                                    "file": file_path,
                                    "thread_status": thread_status,
                                    "comment": content[:200]
                                })
                
                # If PR had conflicts based on status or system threads
                if merge_status == "conflicts" or had_conflicts:
                    # Get all commits in this PR
                    commits_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/pullRequests/{pr_id}/commits"
                    commits_response = await client.get(commits_url, headers=self.headers, params={"api-version": self.api_version})
                    
                    all_commits = []
                    
                    if commits_response.status_code == 200:
                        commits = commits_response.json().get("value", [])
                        
                        for commit in commits:
                            commit_id = commit.get("commitId")
                            
                            # Get files changed in each commit
                            changes_url = f"https://dev.azure.com/{self.organization}/{self.project}/_apis/git/repositories/{repository_id}/commits/{commit_id}/changes"
                            changes_response = await client.get(changes_url, headers=self.headers, params={"api-version": self.api_version})
                            
                            changed_files = []
                            if changes_response.status_code == 200:
                                changes_data = changes_response.json()
                                for change in changes_data.get("changes", [])[:15]:
                                    item = change.get("item", {})
                                    if item.get("gitObjectType") == "blob":
                                        changed_files.append({
                                            "path": item.get("path"),
                                            "change_type": change.get("changeType")
                                        })
                            
                            all_commits.append({
                                "commit_id": commit_id[:12],
                                "message": commit.get("comment"),
                                "author": commit.get("author", {}).get("name"),
                                "date": commit.get("author", {}).get("date"),
                                "changed_files": changed_files,
                                "file_count": len(changed_files)
                            })
                    
                    conflict_prs.append({
                        "pr_id": pr_id,
                        "title": pr.get("title"),
                        "source_branch": pr.get("sourceRefName", "").replace("refs/heads/", ""),
                        "target_branch": pr.get("targetRefName", "").replace("refs/heads/", ""),
                        "created_by": pr.get("createdBy", {}).get("displayName"),
                        "created_date": pr.get("creationDate"),
                        "closed_date": pr.get("closedDate"),
                        "current_merge_status": merge_status,
                        "url": f"https://dev.azure.com/{self.organization}/{self.project}/_git/{repository_name}/pullrequest/{pr_id}",
                        "conflict_detection": {
                            "method": "status_history",
                            "had_conflicts": had_conflicts,
                            "current_status_is_conflict": merge_status == "conflicts",
                            "conflict_files": conflict_files,
                            "conflict_file_count": len(conflict_files)
                        },
                        "iterations": {
                            "count": iteration_count,
                            "details": iteration_details
                        },
                        "commits": all_commits,
                        "commit_count": len(all_commits)
                    })
                    
                    if len(conflict_prs) >= limit:
                        break
            
            # Analyze patterns
            total_files_affected = 0
            file_extensions = {}
            common_files = {}
            
            for pr in conflict_prs:
                for commit in pr.get("commits", []):
                    for file_info in commit.get("changed_files", []):
                        path = file_info.get("path", "")
                        total_files_affected += 1
                        
                        # Track extensions
                        if "." in path:
                            ext = path.split(".")[-1]
                            file_extensions[ext] = file_extensions.get(ext, 0) + 1
                        
                        # Track files
                        common_files[path] = common_files.get(path, 0) + 1
            
            top_extensions = sorted(file_extensions.items(), key=lambda x: x[1], reverse=True)[:5]
            most_conflicted_files = sorted(common_files.items(), key=lambda x: x[1], reverse=True)[:10]
            
            return {
                "repository": repository_name,
                "target_branch": branch,
                "total_prs_with_conflicts": len(conflict_prs),
                "total_files_affected": total_files_affected,
                "prs": conflict_prs,
                "conflict_patterns": {
                    "most_common_extensions": [{"extension": ext, "count": count} for ext, count in top_extensions],
                    "most_conflicted_files": [{"file": file, "conflict_count": count} for file, count in most_conflicted_files]
                }
            }

    async def get_file_content(
        self,
        repository_id: str,
        file_path: str,
        branch: str = "main"
    ) -> Optional[str]:
        """Get file content from a TFVC repository
        
        Args:
            repository_id: Project name (e.g., 'ProductAndDelivery')
            file_path: Full path to the file (e.g., 'DigitalBank/BOA.BusinessModules/Main/...')
            branch: Not used for TFVC (kept for compatibility)
        
        Returns:
            File content as string, or None if file not found
        """
        # For TFVC, construct the path
        # Format: $/ProjectName/Path
        tfvc_path = f"$/{repository_id}/{file_path}"
        
        url = f"https://dev.azure.com/{self.organization}/{repository_id}/_apis/tfvc/items"
        params = {
            "path": tfvc_path,
            "includeContent": "true",  # Critical: This returns actual content, not metadata
            "api-version": self.api_version
        }
        
        # For content retrieval, we need to accept text/plain
        content_headers = self.headers.copy()
        content_headers["Accept"] = "text/plain"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=content_headers, params=params)
                response.raise_for_status()
                
                # TFVC API with includeContent returns JSON with content field
                # Try to parse as JSON first
                try:
                    data = response.json()
                    # If it's JSON, extract content from the response
                    if isinstance(data, dict) and "content" in data:
                        return data["content"]
                    # If it's the items array format
                    elif isinstance(data, dict) and "value" in data and len(data["value"]) > 0:
                        first_item = data["value"][0]
                        if "content" in first_item:
                            return first_item["content"]
                except:
                    # If not JSON, return as text
                    pass
                
                # If we got here, return the raw text
                return response.text
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    return None
                raise
            except Exception as e:
                raise Exception(f"Error fetching file content: {str(e)}")
