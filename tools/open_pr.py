import subprocess
import webbrowser
import sys
import re

def get_git_info():
    try:
        # Get the remote URL (origin)
        remote_url = subprocess.check_output(
            ["git", "config", "--get", "remote.origin.url"], 
            text=True
        ).strip()

        # Get the current branch name
        current_branch = subprocess.check_output(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"], 
            text=True
        ).strip()

        return remote_url, current_branch
    except subprocess.CalledProcessError:
        print("Error: This directory is not a git repository or has no remote.")
        sys.exit(1)

def format_github_url(remote_url):
    # Convert SSH format to HTTPS format for the browser
    # git@github.com:user/repo.git -> https://github.com/user/repo
    if remote_url.startswith("git@"):
        remote_url = remote_url.replace(":", "/").replace("git@", "https://")
    
    if remote_url.endswith(".git"):
        remote_url = remote_url[:-4]
        
    return remote_url

def open_pr_preview(default_branch="main"):
    remote, branch = get_git_info()
    base_url = format_github_url(remote)
    
    # Construct the GitHub compare URL
    # Format: https://github.com/user/repo/compare/main...feature-branch
    compare_url = f"{base_url}/compare/{default_branch}...{branch}"
    
    print(f"Opening PR preview: {compare_url}")
    webbrowser.open(compare_url)

if __name__ == "__main__":
    # You can pass the default branch as an argument if it's not 'main'
    target = sys.argv[1] if len(sys.argv) > 1 else "main"
    open_pr_preview(target)
