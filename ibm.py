import os
import requests

def get_ibm_token():
    url = "https://iam.cloud.ibm.com/identity/token"
    headers = {'Content-Type': 'application/x-www-form-urlencoded'}
    api_key = "KeLVOKnelfNy0lwDEDQy4jbXX_FpUo47SyDGIJVOiW1D"
  # Fetch API key from environment
    if not api_key:
        raise ValueError("IBM API Key not found. Set it as an environment variable.")

    data = {
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': "KeLVOKnelfNy0lwDEDQy4jbXX_FpUo47SyDGIJVOiW1D"
    }

    response = requests.post(url, headers=headers, data=data)
    response.raise_for_status()  # Raises an error for failed requests
    return response.json()['access_token']

def granite_query(prompt):
    token = get_ibm_token()
    url = "https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29"
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    payload = {
        "input": f"<|start_of_role|>system<|end_of_role|>PROMPT<|end_of_text|>\n"
                 f"<|start_of_role|>user<|end_of_role|>{prompt}<|end_of_text|>\n"
                 f"<|start_of_role|>assistant<|end_of_role|>",
        "parameters": {"max_new_tokens": 300},
        "model_id": "ibm/granite-3-8b-instruct",
        # "model_id": "ibm/granite-13b-chat",
        "model_id": "ibm/granite-13b-instruct-v2",
	    "project_id": "44e4e31f-bde1-4da6-85ec-7dfbb505cffa"
        # "project_id": "44e4e31f-bde1-4da6-85ec-7dfbb505cffa"
    }
    # "model_id": "ibm/granite-3-8b-instruct",
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()['results'][0]['generated_text']

# Example Usage
response = granite_query("how  can i plane my holidays")
print(response)