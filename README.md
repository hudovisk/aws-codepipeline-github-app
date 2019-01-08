# AWS CodePipeline Integration with Github App
The idea is to create a nodejs app running in heroku that receives webhooks from github and fires the desired code pipeline in aws to create multiple environments per PR.

This App should create a neutral status after a success run of travis. The neutral status should have an action to trigger AWS CodePipeline