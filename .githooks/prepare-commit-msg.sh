#!/bin/sh

# With thanks to Sergio Vaccaro <sergio.vaccaro@istat.it>

set -e # using the options command to abort script at first error
echo
echo "PREPARE-COMMIT-MSG"

# Branch to protect
PROTECTED_BRANCH="master"

# Remote
REMOTE="origin"

# Check for merges
if [[ $2 != 'merge' ]]; then
    # Not a merge
    ECHO "  not a merge"
    exit 0
fi

# Current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if in PROTECTED_BRANCH
#if [[ "$CURRENT_BRANCH" != "$PROTECTED_BRANCH" ]]; then
#    # Not in PROTECTED_BRANCH: can proceed
#    ECHO "  not in the ${PROTECTED_BRANCH} branch"
#    exit 0
#fi

echo "  you are trying to merge into the ${PROTECTED_BRANCH} branch"
echo "  merging branches to master must be done by creating a pull request"
echo "  this merge has been cancelled however you will need to"
echo "  reset the operation before continuing by running git reset --merge"
echo
exit 1
