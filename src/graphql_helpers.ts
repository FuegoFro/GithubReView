import axios from 'axios';

const URL = 'https://api.github.com/graphql';

export async function graphqlQuery(query: string, variables: { [key: string]: any } = {}): Promise<any> {
  const data: { [key: string]: any } = { query };
  if (variables) {
    data.variables = variables;
  }
  // TODO - wrap this up in accessors
  const token = localStorage.token;
  if (!token) {
    throw Error('Trying to make a request without a token');
  }
  const response = await axios.post(URL, data, { headers: { Authorization: `bearer ${token}` } });
  return response.data.data;
}

export async function viewerUsername(): Promise<string> {
  if (!localStorage.viewerUsername) {
    const queryResult = await graphqlQuery('query { viewer { login } }');
    localStorage.viewerUsername = queryResult.viewer.login;
  }
  return localStorage.viewerUsername;
}
