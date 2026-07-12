export default class CursorAgentExtension {
  static defaultSkillMetadata = Object.freeze({
    author: 'spec-n-roll',
    version: '0.1.0',
  });

  async createSkills(skills) {
    const skillsWithMetadata = skills.map((skill) => ({
      ...skill,
      metadata: skill.metadata ?? CursorAgentExtension.defaultSkillMetadata,
    }));
    void skillsWithMetadata;
  }

  async configureMcp() {}
}
