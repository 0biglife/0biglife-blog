"use client";
// import { TESTING, TODAY_COUNT, TOTAL_COUNT } from "@/lib/constant";
import { DevLog } from "@/lib/types";
import { Box, Link, Text } from "@chakra-ui/react";

interface LogContainerProps {
  logs: DevLog[];
  todayViews: string;
  totalViews: string;
}

const LogContainer = (props: LogContainerProps) => {
  // const { logs, todayViews, totalViews } = props;
  const { logs } = props;

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      flexGrow={1}
      minHeight="300px"
      maxHeight="500px"
      height="90%"
    >
      <Box
        overflowY="scroll"
        display="flex"
        flexDirection="column"
        flexGrow={1}
        sx={{
          scrollbarGutter: "stable",
          "&::-webkit-scrollbar": {
            width: "4px",
            transition: "opacity 0.3s ease-in-out",
          },
        }}
      >
        {logs.map((log) => (
          <Box
            as={Link}
            key={log.slug}
            href={`/dev-logs/${log.slug}`}
            aria-label={`log-entry-${log.date}`}
            p={3}
            minWidth="140px"
            display="flex"
            alignItems="flex-start"
            flexDirection="column"
            mb="8px"
            borderRadius="md"
            boxShadow="sm"
            color="gray.600"
            _dark={{
              color: "gray.300",
            }}
            _hover={{
              boxShadow: "md",
              textDecoration: "underline",
              color: "black",
              bg: "rgba(0, 0, 0, 0.05)",
              _dark: {
                color: "white",
                bg: "rgba(255, 255, 255, 0.1)",
              },
            }}
            cursor="pointer"
            transition="all 0.2s ease-in-out"
            gap={1}
          >
            <Text fontSize="14px" fontWeight="semibold" noOfLines={2}>
              {log.title}
            </Text>
            <Text fontSize="12px" opacity={0.8}>
              Last updated on {log.date}
            </Text>
          </Box>
        ))}
      </Box>
      {/* <Box
        width="100%"
        minWidth="100px"
        display="flex"
        flexDirection="column"
        gap="4x"
        mt="18px"
        mb="4px"
        alignItems="flex-end"
      >
        <Text fontSize="12px" noOfLines={1}>
          {TODAY_COUNT} ({TESTING}){" "}
          <Text as="span" fontWeight="semibold" ml="8px">
            {todayViews}
          </Text>
        </Text>
        <Text fontSize="12px" noOfLines={1}>
          {TOTAL_COUNT} ({TESTING}){" "}
          <Text as="span" fontWeight="semibold" ml="6px">
            {totalViews}
          </Text>
        </Text>
      </Box> */}
    </Box>
  );
};

export default LogContainer;
