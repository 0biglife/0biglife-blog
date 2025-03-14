"use client";
import { Heading } from "@chakra-ui/react";

interface TitleProps {
  label: string;
}

const Title = (props: TitleProps) => {
  const { label } = props;

  return (
    <Heading
      as="h1"
      textAlign="left"
      fontWeight="medium"
      mb={6}
      fontSize="22px"
      fontStyle="italic"
    >
      {label ?? "No Title"}
    </Heading>
  );
};

export default Title;
