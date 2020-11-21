
# Sample script

NOT UNDER WARRANTY
NOT OFFICIAL ADVICE

Purpose is to accelerate getting started.

## Installation

`npm install`

## Run 

`API_KEY = "<YOUR API KEY>" node index.js`

- First run will register the domain if avaialble
- Second run will blindly add DNS records
- You need to fill in the constants for it to run (API_EMAIL, ACCOUNT_ID etc.)

## Note

- There is error handling or sophisticated logic at all.
- It costs $$ to register a domain! You can also register a domain on freenom and transfer to Cloudflare if you want to focus on the other API calls
- The "Custom Hostnames" part requires an [SSL for SaaS](https://developers.cloudflare.com/ssl/ssl-for-saas)
- I'll need to set that up for you and if you want to use it, I'll need to give you a walkthrough.