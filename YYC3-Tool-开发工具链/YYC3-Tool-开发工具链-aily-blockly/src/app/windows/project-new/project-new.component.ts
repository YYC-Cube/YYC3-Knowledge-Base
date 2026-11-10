import { ChangeDetectorRef, Component } from '@angular/core';
import { SubWindowComponent } from '../../components/sub-window/sub-window.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { ElectronService } from '../../services/electron.service';
import { ProjectService } from '../../services/project.service';
import { ConfigService } from '../../services/config.service';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NpmService } from '../../services/npm.service';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TranslateModule } from '@ngx-translate/core';
import { UiService } from '../../services/ui.service';
import { PlatformService } from '../../services/platform.service';
import { CloudService } from '../../tools/cloud-space/services/cloud.service';
import { firstValueFrom } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import type { NewProjectData } from '../../types/project-new';

@Component({
  selector: 'app-project-new',
  imports: [
    CommonModule,
    FormsModule,
    SubWindowComponent,
    NzButtonModule,
    NzInputModule,
    NzStepsModule,
    NzSelectModule,
    NzTagModule,
    TranslateModule
  ],
  templateUrl: './project-new.component.html',
  styleUrl: './project-new.component.scss',
})
export class ProjectNewComponent {
  currentStep = 0;

  myTemplateList: CloudProjectTemplate[] = [];
  isLoadingTemplates = false;
  selectedTemplateName = '';

  currentBoard: any = null;
  newProjectData: NewProjectData = {
    name: '',
    path: '',
    board: {
      name: '',
      nickname: '',
      version: '',
    }
  };

  boardVersion = '';

  // 搜索开发板关键字
  keyword = '';
  tagList = ['Arduino', 'ESP32', 'WiFiduino', 'XIAO', 'Seeed', 'OpenJumper', 'seekfree', 'keyesrobot', 'emakefun', 'Raspberry Pi'];
  _boardList: any[] = [];
  boardList: any[] = [];
  tagListRandom;

  get resourceUrl() {
    return this.configService.getCurrentResourceUrl() + '/imgs/boards/';
  }

  constructor(
    private electronService: ElectronService,
    private projectService: ProjectService,
    private configService: ConfigService,
    private npmService: NpmService,
    private uiService: UiService,
    private platformService: PlatformService,
    private cloudService: CloudService,
    private cd: ChangeDetectorRef,
    private message: NzMessageService
  ) { }

  get selectedTemplate(): CloudProjectTemplate | null {
    return this.myTemplateList.find(template => template.name === this.selectedTemplateName) || null;
  }

  get selectedTemplateDescription(): string {
    const description = this.selectedTemplate?.description?.trim() || '';
    if (description.length <= 20) {
      return description;
    }
    return `${description.slice(0, 20)}......`;
  }

  async ngOnInit() {
    if (this.electronService.isElectron) {
      const pt = this.platformService.getPlatformSeparator();
      this.newProjectData.path = window['path'].getUserDocuments() + `${pt}aily-project${pt}`;
    }
    // await this.configService.init();
    this._boardList = this.process(this.configService.boardList);
    this.boardList = JSON.parse(JSON.stringify(this._boardList));
    this.currentBoard = this.boardList[0];

    // 随机提取前五个
    this.tagListRandom = this.tagList.sort(() => Math.random() - 0.5).slice(0, 5);

    this.newProjectData.board.nickname = this.currentBoard.nickname;
    this.newProjectData.board.name = this.currentBoard.name;
    this.newProjectData.board.version = this.currentBoard.version;
    this.newProjectData.name = this.projectService.generateUniqueProjectName(this.newProjectData.path, 'project_');
  }

  process(array) {
    let _array = JSON.parse(JSON.stringify(array));
    for (let index = 0; index < _array.length; index++) {
      const item = _array[index];
      // 为全文搜索做准备
      item['fulltext'] = `${item.nickname}${item.brand}${item.description}${item.keywords}`.replace(/\s/g, '').toLowerCase();
    }
    return _array;
  }

  search(keyword = this.keyword) {
    if (keyword) {
      keyword = keyword.replace(/\s/g, '').toLowerCase();
      this.boardList = this._boardList.filter(item => item.fulltext.includes(keyword));
    } else {
      this.boardList = JSON.parse(JSON.stringify(this._boardList));
    }
  }

  selectBoard(boardInfo: BoardInfo) {
    // if (boardInfo.disabled) return;
    this.currentBoard = boardInfo;
    this.newProjectData.board.name = boardInfo.name;
    this.newProjectData.board.nickname = boardInfo.nickname;
    this.newProjectData.board.version = boardInfo.version;
    this.loadMyTemplates(boardInfo.name);
  }

  loadMyTemplates(boardName: string) {
    this.myTemplateList = [];
    this.selectedTemplateName = '';
    if (!boardName?.trim()) {
      this.isLoadingTemplates = false;
      this.cd.detectChanges();
      return;
    }

    this.isLoadingTemplates = true;
    this.cloudService.getMyTemplates(1, 20, boardName).subscribe({
      next: (res) => {
        if (res?.status === 200 && Array.isArray(res?.data?.list)) {
          this.myTemplateList = res.data.list;
          this.selectedTemplateName = '';
        } else {
          this.myTemplateList = [];
          this.selectedTemplateName = '';
        }
        this.isLoadingTemplates = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.myTemplateList = [];
        this.selectedTemplateName = '';
        this.isLoadingTemplates = false;
        this.cd.detectChanges();
      }
    });
  }

  // 可用版本列表
  boardVersionList: any[] = [];
  async nextStep() {
    this.boardVersionList = [this.newProjectData.board.version];
    this.currentStep = this.currentStep + 1;
    this.boardVersionList = (await this.npmService.getPackageVersionList(this.newProjectData.board.name)).reverse();
  }

  async selectFolder() {
    const folderPath = await window['ipcRenderer'].invoke('select-folder', {
      path: this.newProjectData.path,
    });
    // console.log('选中的文件夹路径：', folderPath);
    const pt = this.platformService.getPlatformSeparator();
    if (folderPath.slice(-1) !== pt) {
      this.newProjectData.path = folderPath + pt;
    }
    // 在这里对返回的 folderPath 进行后续处理
  }

  // 检查项目名称是否存在
  showIsExist = false;
  async checkPathIsExist(): Promise<boolean> {
    const pt = this.platformService.getPlatformSeparator();
    let path = this.newProjectData.path + pt + this.newProjectData.name;
    let isExist = window['path'].isExists(path);
    if (isExist) {
      this.showIsExist = true;
    } else {
      this.showIsExist = false;
    }
    return isExist;
  }

  async createProject() {
    // 判断是否有同名项目
    if (await this.checkPathIsExist()) {
      return;
    }
    this.currentStep = 2;

    let success = false;
    let extractPath = '';
    try {
      if (this.selectedTemplateName) {
        const templateProject = await this.findSelectedTemplateProject();
        if (!templateProject?.archive_url) {
          throw new Error('未找到所选模板的归档文件');
        }

        const archiveUrl = `${this.cloudService.baseUrl}${templateProject.archive_url}`;
        extractPath = await firstValueFrom(this.cloudService.getProjectArchive(archiveUrl));
        success = await this.projectService.projectNewFromTemplate(this.newProjectData, extractPath);
      } else {
        success = await this.projectService.projectNew(this.newProjectData);
      }
    } catch (error: any) {
      const message = typeof error === 'string' ? error : (error?.message || '创建项目失败');
      this.message.error(message);
    } finally {
      if (extractPath) {
        this.cloudService.cleanupExtractedFiles(extractPath);
      }
    }

    if (success) {
      this.uiService.closeWindow();
      return;
    }

    this.currentStep = 1;
  }

  private async findSelectedTemplateProject(): Promise<any> {
    const selectedTemplate = this.selectedTemplate;
    if (!selectedTemplate) {
      return null;
    }

    const pageSize = 100;
    let page = 1;
    let total = 0;

    do {
      const res = await firstValueFrom(this.cloudService.getProjects(page, pageSize));
      const projects = Array.isArray(res?.data?.list) ? res.data.list : [];
      total = Number(res?.data?.total || 0);

      const matchedProject = projects.find((project: any) => (
        project?.is_template === true &&
        project?.name === selectedTemplate.name &&
        (project?.nickname || '') === (selectedTemplate.nickname || '') &&
        (project?.description || '') === (selectedTemplate.description || '')
      ));

      if (matchedProject) {
        return matchedProject;
      }

      page += 1;
    } while ((page - 1) * pageSize < total);

    throw new Error('未找到所选模板项目');
  }

  openUrl(url) {
    this.electronService.openUrl(url);
  }

  help() {
    this.electronService.openUrl("https://github.com/ailyProject/aily-blockly-boards/blob/main/readme.md");
  }
}


export interface BoardInfo {
  "name": string, // 开发板在仓库中的名称开发板名称
  "nickname": string, // 显示的开发板名称
  "version": string,
  "img": string,
  "description": string,
  "url": string,
  "brand": string,
  "disabled": boolean, // 是否禁用
  "type"?: string, // 开发板类型/核心架构 (如 esp32:esp32, arduino:avr, etc)
}

interface CloudProjectTemplate {
  name: string;
  nickname?: string;
  description?: string;
}
