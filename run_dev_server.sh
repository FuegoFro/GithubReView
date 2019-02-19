#!/usr/bin/env bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "${DIR}/src"
FLASK_ENV=development FLASK_APP=app.py pipenv run flask run

