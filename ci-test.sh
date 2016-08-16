RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
docker-compose -f test/docker-compose.yml -p ci up -d
if [ $? -ne 0 ] ; then
  printf "${RED}Docker Compose Failed${NC}\n"
  exit -1
fi
docker logs -f ci_api_1
TEST_EXIT_CODE=`docker wait ci_api_1`
if [ -z ${TEST_EXIT_CODE+x} ] || [ "$TEST_EXIT_CODE" -ne 0 ] ; then
  printf "${RED}Tests Failed${NC} - Exit Code: $TEST_EXIT_CODE\n"
else
  printf "${GREEN}Tests Passed${NC}\n"
fi
exit $TEST_EXIT_CODE
