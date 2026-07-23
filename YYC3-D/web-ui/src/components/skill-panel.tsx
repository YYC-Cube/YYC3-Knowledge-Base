/**
 * @description SkillPanel Component
 * @module @yyc3/web-ui/components/skill-panel
 */

import React from 'react';
import { useSkills } from '../hooks/use-skills';

export function SkillPanel(): JSX.Element {
  const { skills, selectedSkill, setSelectedSkill, executeSkill } = useSkills();

  const handleExecute = () => {
    if (selectedSkill) {
      executeSkill(selectedSkill.id, {});
    }
  };

  return React.createElement(
    'div',
    { className: 'yyc3-skill-panel' },
    React.createElement('h3', null, '技能面板'),
    React.createElement(
      'div',
      { className: 'yyc3-skill-list' },
      skills.map((skill) =>
        React.createElement(
          'div',
          {
            key: skill.id,
            className: `yyc3-skill-item ${selectedSkill?.id === skill.id ? 'selected' : ''}`,
            onClick: () => setSelectedSkill(skill),
          },
          React.createElement('h4', null, skill.name),
          React.createElement('p', null, skill.description),
          React.createElement('span', { className: 'yyc3-skill-category' }, skill.category)
        )
      )
    ),
    selectedSkill &&
      React.createElement(
        'button',
        { onClick: handleExecute, className: 'yyc3-skill-execute' },
        `执行 ${selectedSkill.name}`
      )
  );
}
