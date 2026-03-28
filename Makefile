.PHONY: test simulate check all

test:
	node test.mjs

simulate:
	node simulate.mjs

check: test simulate

all: check
