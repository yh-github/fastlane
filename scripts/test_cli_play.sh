#!/bin/bash
# Week 1: Enter Employment Office (8), apply for Cook (5), exit (1),
# go to Monolith Burgers (4), work x7, then let turn end.
# Week 2: should see weekend report + starvation
printf '8\n5\n1\n4\n8\n8\n8\n8\n8\n8\n8\n\n0\n' | timeout 15 npm run play:cli 2>&1
