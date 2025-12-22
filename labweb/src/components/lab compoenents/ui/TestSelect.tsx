import React from "react";
import Select, { MultiValue } from "react-select";
import { TestType } from "@/lab types/sample";

export interface TestOption {
  label: string;
  value: TestType;
}

interface Props {
  tests: TestType[];
  selected: TestType[];
  onChange: (tests: TestType[]) => void;
}

const TestSelect: React.FC<Props> = ({ tests, selected, onChange }) => {
  const options: TestOption[] = tests.map((t) => ({ label: t.name, value: t }));
  const selectedOptions: TestOption[] = selected.map((t) => ({ label: t.name, value: t }));

  const handleChange = (val: MultiValue<TestOption>) => {
    onChange(val.map((v) => v.value));
  };

  return (
    <Select
      options={options}
      value={selectedOptions}
      isMulti
      placeholder="Select tests..."
      onChange={handleChange}
      classNamePrefix="react-select"
    />
  );
};

export default TestSelect;
