.PHONY: validate test test-spec test-identity test-manage

validate: test

test: test-spec test-identity test-manage

test-spec:
	python3 tests/test_skills_spec.py

test-identity:
	bash tests/test-identity.sh

test-manage:
	bash tests/test-manage.sh
