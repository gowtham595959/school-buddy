#!/usr/bin/env bash
# --------------------------------------------------------
# Forwards to Code_DB_MergeGIT_DeployAzure.sh for backward compatibility.
# Use: ./scripts/Code_DB_MergeGIT_DeployAzure.sh db-migrations | db-full | db-full-sql-files
# --------------------------------------------------------
case "${1:-}" in
  migrations) exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" db-migrations ;;
  full)       exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" db-full ;;
  full-sql-files|full-with-migrate)
    exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" db-full-sql-files ;;
  *)          exec "$(dirname "$0")/Code_DB_MergeGIT_DeployAzure.sh" status ;;
esac
