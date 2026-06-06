#!/bin/bash
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
export GOOGLE_CLOUD_PROJECT="app-reformia"

echo "=== Running Backend Unit Tests (Ignoring Integration Tests) ==="
PYTHONPATH=. ./venv/bin/pytest tests/ --ignore=tests/test_integration_firestore.py
UNIT_TESTS_EXIT=$?

if [ $UNIT_TESTS_EXIT -ne 0 ]; then
  echo "Unit tests failed! Aborting integration tests."
  exit $UNIT_TESTS_EXIT
fi

echo "=== Running Backend Integration Tests with Firebase Emulators ==="
npx firebase-tools emulators:exec "PYTHONPATH=. ./venv/bin/pytest tests/test_integration_firestore.py"
INTEG_TESTS_EXIT=$?

exit $INTEG_TESTS_EXIT
