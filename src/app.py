from datetime import datetime
from typing import NamedTuple, Dict, Any, TypeVar, Type, List, Sequence

from flask import Flask, render_template, jsonify

from github_graphql_helpers import graphql_query

app = Flask(__name__)

T = TypeVar("T")


def assert_is_instance(value: object, expected_type: Type[T]) -> T:
    assert isinstance(value, expected_type)
    return value


class PrOverview(NamedTuple):
    repo_owner: str
    repo_name: str
    number: int
    title: str

    @classmethod
    def from_pr_response(cls, pr_response: Dict[str, Any]) -> "PrOverview":
        return PrOverview(
            repo_owner=assert_is_instance(pr_response["repository"]["owner"]["login"], str),
            repo_name=assert_is_instance(pr_response["repository"]["name"], str),
            number=assert_is_instance(pr_response["number"], int),
            title=assert_is_instance(pr_response["title"], str),
        )


@app.route("/")
def overview():
    data = graphql_query(
        """
        query {
            authored: search(query: "is:open is:pr author:FuegoFro archived:false" type:ISSUE first:100) {
                ... prDetails
            }
            reviewing: search(query: "is:open is:pr review-requested:FuegoFro archived:false" type:ISSUE first:100) {
                ... prDetails
            }
        
        }
        fragment prDetails on SearchResultItemConnection {
            nodes {
                ... on PullRequest {
                    number
                    title
                    repository {
                       owner {
                            login
                        }
                        name
                    }
                }
            }
        }
    """
    )["data"]
    requested_issues = [PrOverview.from_pr_response(pr) for pr in data["reviewing"]["nodes"]]
    created_issues = [PrOverview.from_pr_response(pr) for pr in data["authored"]["nodes"]]

    return render_template("overview.html", requested_issues=requested_issues, created_issues=created_issues)


def _parse_datetime(raw_datetime: str) -> datetime:
    assert raw_datetime[-1] == "Z"
    return datetime.fromisoformat(raw_datetime[:-1])


class PrInlineComment(NamedTuple):
    author_name: str
    body: str
    created_at: datetime
    path: str
    line: int

    @classmethod
    def from_response(cls, data: Any) -> "PrInlineComment":
        return PrInlineComment(
            assert_is_instance(data["author"]["login"], str),
            assert_is_instance(data["body"], str),
            _parse_datetime(assert_is_instance(data["createdAt"], str)),
            assert_is_instance(data["path"], str),
            assert_is_instance(data["originalPosition"], int),
        )


class PrTopLevelComment(NamedTuple):
    author_name: str
    body: str
    created_at: datetime
    inline_comments: Sequence[PrInlineComment]

    @classmethod
    def from_response(cls, data: Any) -> "PrTopLevelComment":
        raw_inline_comments = data.get("comments")
        if raw_inline_comments is None:
            inline_comments = []
        else:
            inline_comments = sorted(
                (
                    PrInlineComment.from_response(raw_inline_comment)
                    for raw_inline_comment in raw_inline_comments["nodes"]
                ),
                key=lambda c: c.created_at,
            )

        return PrTopLevelComment(
            assert_is_instance(data["author"]["login"], str),
            assert_is_instance(data["body"], str),
            _parse_datetime(assert_is_instance(data["createdAt"], str)),
            inline_comments,
        )


@app.route("/pr/<owner>/<repo>/<number>")
def pr_details(owner, repo, number):
    # TODO - show comments for PR
    query = """
        query($repo_owner: String!, $repo_name: String!, $pr_number: Int!) {
            repository(owner: $repo_owner, name: $repo_name) {
                pullRequest(number: $pr_number) {
                    title
                    comments(first: 100) {
                        nodes {
                            ...commentInfo
                        }
                    }
                    reviews(first: 100) {
                        nodes {
                            ...commentInfo
                            state
                            comments(first: 100) {
                                nodes {
                                    originalPosition
                                    path
                                    ...commentInfo
                                }
                            }
                        }
                    }
                }
            }
        }
        fragment commentInfo on Comment {
            author {
                login
            }
            body
            createdAt
        }
    """
    variables = {"repo_owner": owner, "repo_name": repo, "pr_number": int(number)}
    data = graphql_query(query, variables)

    raw_pr = data["data"]["repository"]["pullRequest"]
    title = raw_pr["title"]

    raw_comments = raw_pr["comments"]["nodes"] + raw_pr["reviews"]["nodes"]
    comments = sorted(
        (PrTopLevelComment.from_response(raw_comment) for raw_comment in raw_comments), key=lambda c: c.created_at
    )

    return render_template("pr_details.html", title=title, comments=comments)
