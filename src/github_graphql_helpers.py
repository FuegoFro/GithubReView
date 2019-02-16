import json
from pathlib import Path
from typing import Any, Dict, Optional

import requests

HEADERS = {"Authorization": f'bearer {(Path.home() / ".github_token").read_text()}'}
URL = "https://api.github.com/graphql"


def graphql_query(query: str, variables: Optional[Dict[str, Any]] = None) -> Any:
    data = {"query": query}
    if variables is not None:
        data["variables"] = variables
    return requests.post(URL, headers=HEADERS, data=json.dumps(data)).json()
