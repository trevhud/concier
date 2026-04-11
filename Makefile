.PHONY: all build dev dev-http start start-http start-frontend test test_watch lint format typecheck help

# Default target executed when no arguments are given to make.
all: help

# TypeScript/Node.js targets
build:
	npm run build

dev:
	npm run dev

dev-http:
	npm run dev:http

start:
	npm run start

start-http:
	npm run start:http

start-frontend:
	npm run start:frontend

test:
	npm run test

test_watch:
	npm run test:watch

lint:
	npm run lint

format:
	npm run format

typecheck:
	npm run typecheck

install:
	npm install

clean:
	rm -rf dist/ node_modules/

# Help
help:
	@echo '----'
	@echo 'TypeScript MCP Server Commands:'
	@echo 'build                        - build TypeScript to JavaScript'
	@echo 'dev                          - run MCP server in development with watch'
	@echo 'dev-http                     - run HTTP server in development with watch'
	@echo 'start                        - start the MCP server (production)'
	@echo 'start-http                   - start the HTTP server (production)'
	@echo 'start-frontend               - start the React frontend'
	@echo 'test                         - run tests'
	@echo 'test_watch                   - run tests in watch mode'
	@echo 'lint                         - run ESLint'
	@echo 'format                       - run Prettier formatting'
	@echo 'typecheck                    - run TypeScript type checking'
	@echo 'install                      - install npm dependencies'
	@echo 'clean                        - remove build artifacts'