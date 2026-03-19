#!/usr/bin/env bash
# --------------------------------------------------------
# Forwards to Code_DB_MergeGIT_DeployAzure.sh for backward compatibility.
# Use: ./scripts/Code_DB_MergeGIT_DeployAzure.sh db-migrations | db-full
# --------------------------------------------------------
case "${1:-}" in
  migrations) exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" db-migrations ;;
  full)       exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" db-full ;;
  *)          exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" status ;;
esac
