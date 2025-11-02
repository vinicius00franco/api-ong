.PHONY: help test test-docker test-local test-watch test-coverage clean install setup

help:
	@echo "LLM API - Test Commands"
	@echo "======================="
	@echo ""
	@echo "Setup:"
	@echo "  make install       - Install test dependencies locally"
	@echo "  make setup         - Setup everything (Docker build)"
	@echo ""
	@echo "Testing:"
	@echo "  make test          - Run tests via Docker (recommended)"
	@echo "  make test-docker   - Same as 'make test'"
	@echo "  make test-local    - Run tests locally"
	@echo "  make test-watch    - Run tests locally with watch mode"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean         - Remove test artifacts"
	@echo "  make run           - Run API locally on port 8000"
	@echo "  make run-docker    - Run API via Docker on port 8000"
	@echo ""

install:
	pip install -r requirements-test.txt --break-system-packages

test: test-docker

test-docker:
	bash ../run-llm-tests.sh

test-local: install
	pytest tests/ -v --cov=llm_api --cov-report=html --cov-report=term-missing

test-watch: install
	pytest tests/ -v --cov=llm_api --cov-report=html -p no:warnings --tb=short -c pytest.ini --looponfail

test-coverage: test-local
	@echo "✓ Coverage report available at: htmlcov/index.html"

setup:
	docker build -f Dockerfile.test -t llm-api-tests .

run: install
	GOOGLE_API_KEY=$${GOOGLE_API_KEY} uvicorn main:app --reload --port 8000

run-docker:
	docker build -f Dockerfile -t llm-api .
	docker run -p 8000:8000 --env-file .env llm-api

clean:
	rm -rf htmlcov/
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf *.pyc
	rm -rf __pycache__/
	rm -rf tests/__pycache__/
	rm -rf llm_api/__pycache__/
	find . -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

compose-test:
	docker-compose --profile test up llm-api-tests

compose-down:
	docker-compose --profile test down
