#!/bin/bash
echo "Testing deepwiki via mcp2cli"
uvx mcp2cli --mcp https://mcp.deepwiki.com/mcp ask-question --repo-name facebook/react --question "What is concurrent mode?"
