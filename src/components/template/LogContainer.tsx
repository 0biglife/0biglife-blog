"use client";
import { DevLog } from "@/lib/types";
import { Box, Link, Text, useColorModeValue } from "@chakra-ui/react";

interface LogContainerProps {
  logs: DevLog[];
  todayVisitorCount: number;
  totalVisitorCount: number;
}

const TODAY = "Today";
const TOTAL = "Total";

const LogContainer = (props: LogContainerProps) => {
  const { logs, todayVisitorCount, totalVisitorCount } = props;

  const textColor = useColorModeValue("gray.600", "gray.300");
  const hoverTextColor = useColorModeValue("black", "white");
  const hoverBg = useColorModeValue(
    "rgba(0, 0, 0, 0.05)",
    "rgba(255, 255, 255, 0.1)"
  );

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
            color={textColor}
            _hover={{
              boxShadow: "md",
              textDecoration: "underline",
              color: hoverTextColor,
              fontWeight: "semibold",
              bg: hoverBg,
            }}
            cursor="pointer"
            transition="all 0.2s ease-in-out"
          >
            <Text fontSize="12px">{log.date}</Text>
            <Text fontSize="12px">{log.title}</Text>
          </Box>
        ))}
      </Box>
      <Box
        width="100%"
        display="flex"
        justifyContent="flex-end"
        flexDirection="column"
        height="40px"
        gap="4x"
        mt="18px"
        mb="4px"
        alignItems="flex-end"
      >
        <Text fontSize="12px">
          {TODAY}{" "}
          <Text as="span" fontWeight="semibold" ml="8px">
            {todayVisitorCount}
          </Text>
        </Text>
        <Text fontSize="12px">
          {TOTAL}{" "}
          <Text as="span" fontWeight="semibold" ml="6px">
            {totalVisitorCount}
          </Text>
        </Text>
      </Box>
    </Box>
  );
};

export default LogContainer;
