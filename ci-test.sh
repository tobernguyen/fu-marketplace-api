while ! curl -s elasticsearch:9200 > /dev/null; do echo wait for elasticsearch; sleep 0.5; done; npm test --silent