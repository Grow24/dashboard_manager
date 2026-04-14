import React from 'react';

type SectionProps = {
  active: boolean;
  children: React.ReactNode;
};

export const BasicTabBasicSection: React.FC<SectionProps> = ({ active, children }) =>
  active ? <>{children}</> : null;

export const BasicTabStylingSection: React.FC<SectionProps> = ({ active, children }) =>
  active ? <>{children}</> : null;

export const BasicTabEventsSection: React.FC<SectionProps> = ({ active, children }) =>
  active ? <>{children}</> : null;

export const BasicTabValidationSection: React.FC<SectionProps> = ({ active, children }) =>
  active ? <>{children}</> : null;

export const BasicTabOptionsSection: React.FC<SectionProps> = ({ active, children }) =>
  active ? <>{children}</> : null;

export const BasicTabQueryBuilderSection: React.FC<SectionProps> = ({ active, children }) =>
  active ? <>{children}</> : null;
