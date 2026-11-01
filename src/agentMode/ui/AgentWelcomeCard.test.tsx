import * as obsidian from "obsidian";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AgentWelcomeCard } from "@/agentMode/ui/AgentWelcomeCard";

describe("AgentWelcomeCard", () => {
  it("invokes onCreate when the CTA is clicked", () => {
    const onCreate = jest.fn();
    render(<AgentWelcomeCard onCreate={onCreate} onDismiss={jest.fn()} />);
    fireEvent.click(screen.getByText("New project"));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("invokes onDismiss from the × control", () => {
    const onDismiss = jest.fn();
    render(<AgentWelcomeCard onCreate={jest.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders Chinese actions and keeps create and dismiss callbacks working", () => {
    const language = jest.spyOn(obsidian, "getLanguage").mockReturnValue("zh");
    try {
      const onCreate = jest.fn();
      const onDismiss = jest.fn();
      render(<AgentWelcomeCard onCreate={onCreate} onDismiss={onDismiss} />);
      expect(screen.getByText("试试项目功能")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "新项目" }));
      fireEvent.click(screen.getByRole("button", { name: "关闭" }));
      expect(onCreate).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      language.mockRestore();
    }
  });
});
