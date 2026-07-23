#!/bin/bash
git add .
msg=${1:-"auto: update content/model/script"}
git commit -m "$msg"
git pull --rebase
git push