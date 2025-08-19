#!/usr/bin/env bash
set -euo pipefail


# 1) Start local replica in another terminal: dfx start --clean --background
# 2) Deploy token & task


dfx deploy chora_token


dfx deploy task


# 3) Set the Task canister as the minter of CHRA so it can mint rewards
TASK_ID=$(dfx canister id task)
TOKEN_ID=$(dfx canister id chora_token)


echo "Setting minter to task canister: $TASK_ID"
dfx canister call chora_token setMinter '(principal '"$TASK_ID"')'


# 4) Quick sanity: show symbol and mint test via completing a task


PRINCIPAL=$(dfx identity get-principal)


echo "Add sample task"
dfx canister call task addTask '("Belajar ICP 1 jam")'


echo "Complete task to trigger reward"
dfx canister call task completeTask '(0)'


echo "Balance of caller in CHRA:"
dfx canister call chora_token balanceOf "(principal \"$PRINCIPAL\")"