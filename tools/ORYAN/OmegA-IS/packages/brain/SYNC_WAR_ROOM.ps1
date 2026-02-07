# SYNC_WAR_ROOM.ps1
# Automates the creation of the OMEGA v0 branch and PR

echo "Checking GitHub Auth..."
gh auth status
if ($LASTEXITCODE -ne 0) {
    echo "Please run 'gh auth login' first!"
    exit 1
}

echo "Creating branch omega-v0-init..."
git checkout -b omega-v0-init

echo "Adding OMEGA docs..."
git add docs/ ISSUES_TO_CREATE.md
git commit -m "feat: OMEGA v0 System Specs and Worker Contracts"

echo "Pushing to origin..."
git push -u origin omega-v0-init

echo "Creating PR..."
gh pr create --title "OMEGA v0: System Specs & Worker Pack" --body "Implements the initial OMEGA architecture, worker contracts, and decision log template. See ISSUES_TO_CREATE.md for the full issue tracking plan."

echo "Sync Complete. War Room is active."
