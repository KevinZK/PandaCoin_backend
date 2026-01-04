import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SkillDefinition, SkillExample, SkillType } from './skills.types';
import { LoggerService } from '../common/logger/logger.service';

/**
 * 技能加载器 - 从 SKILL.md 文件加载技能定义
 */
@Injectable()
export class SkillLoaderService implements OnModuleInit {
  private skills: Map<SkillType, SkillDefinition> = new Map();
  private readonly skillsDir = path.join(__dirname);

  constructor(private logger: LoggerService) {}

  async onModuleInit() {
    await this.loadAllSkills();
  }

  /**
   * 加载所有技能定义
   */
  async loadAllSkills(): Promise<void> {
    const skillFolders = [
      'accounting',
      'bill-analysis',
      'budget-advisor',
      'investment',
      'loan-advisor',
    ];

    for (const folder of skillFolders) {
      try {
        const skill = await this.loadSkill(folder as SkillType);
        if (skill) {
          this.skills.set(folder as SkillType, skill);
          this.logger.log(`✅ 已加载技能: ${folder}`, 'SkillLoader');
        }
      } catch (error) {
        this.logger.error(`❌ 加载技能失败: ${folder}`, error.stack, 'SkillLoader');
      }
    }

    this.logger.log(`📦 共加载 ${this.skills.size} 个技能`, 'SkillLoader');
  }

  /**
   * 加载单个技能
   */
  async loadSkill(skillName: SkillType): Promise<SkillDefinition | null> {
    const skillPath = path.join(this.skillsDir, skillName, 'SKILL.md');

    if (!fs.existsSync(skillPath)) {
      this.logger.warn(`⚠️ 技能文件不存在: ${skillPath}`, 'SkillLoader');
      return null;
    }

    const content = fs.readFileSync(skillPath, 'utf-8');
    return this.parseSkillMd(skillName, content);
  }

  /**
   * 解析 SKILL.md 文件
   */
  private parseSkillMd(name: string, content: string): SkillDefinition {
    const skill: SkillDefinition = {
      name,
      description: '',
      contextRequired: [],
      instructions: '',
      outputSchema: {},
      examples: [],
    };

    // 解析 Description
    const descMatch = content.match(/## Description\s*\n([\s\S]*?)(?=\n##|$)/);
    if (descMatch) {
      skill.description = descMatch[1].trim();
    }

    // 解析 Context Required
    const contextMatch = content.match(/## Context Required\s*\n([\s\S]*?)(?=\n##|$)/);
    if (contextMatch) {
      const contextLines = contextMatch[1].trim().split('\n');
      skill.contextRequired = contextLines
        .filter((line) => line.startsWith('-'))
        .map((line) => line.replace(/^-\s*/, '').split(':')[0].trim());
    }

    // 解析 Instructions
    const instructionsMatch = content.match(/## Instructions\s*\n([\s\S]*?)(?=\n## Output Schema|$)/);
    if (instructionsMatch) {
      skill.instructions = instructionsMatch[1].trim();
    }

    // 解析 Output Schema
    const schemaMatch = content.match(/## Output Schema\s*\n```json\s*\n([\s\S]*?)\n```/);
    if (schemaMatch) {
      try {
        skill.outputSchema = JSON.parse(schemaMatch[1]);
      } catch (e) {
        this.logger.warn(`⚠️ 无法解析 ${name} 的 Output Schema`, 'SkillLoader');
      }
    }

    // 解析 Examples
    const examplesMatch = content.match(/## Examples\s*\n([\s\S]*?)$/);
    if (examplesMatch) {
      const exampleBlocks = examplesMatch[1].split(/### Example \d+:/);
      for (const block of exampleBlocks) {
        if (!block.trim()) continue;

        const inputMatch = block.match(/Input:\s*"([^"]+)"/);
        const outputMatch = block.match(/Output:\s*\n```json\s*\n([\s\S]*?)\n```/);

        if (inputMatch && outputMatch) {
          try {
            skill.examples.push({
              input: inputMatch[1],
              output: JSON.parse(outputMatch[1]),
            });
          } catch (e) {
            // 忽略解析失败的示例
          }
        }
      }
    }

    return skill;
  }

  /**
   * 获取技能定义
   */
  getSkill(skillName: SkillType): SkillDefinition | undefined {
    return this.skills.get(skillName);
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): Map<SkillType, SkillDefinition> {
    return this.skills;
  }

  /**
   * 获取技能列表摘要（用于路由）
   */
  getSkillsSummary(): Array<{ name: string; description: string }> {
    return Array.from(this.skills.entries()).map(([name, skill]) => ({
      name,
      description: skill.description,
    }));
  }
}
