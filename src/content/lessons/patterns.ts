import type { LessonBook } from './types';

export const patternLesson: LessonBook = {
  id: 'patterns-culture',
  themeId: 'patterns',
  version: 1,
  title: '纹样与色彩',
  sources: [
    { id: 'classification', title: '常书鸿代序：敦煌图案的装饰部位与用途（清华大学出版社）', url: 'https://www.tup.tsinghua.edu.cn/booksCenter/bookpreface?id=00894801' },
    { id: 'cave-329', title: '敦煌研究院：莫高窟第329窟（初唐）', url: 'https://www.dha.ac.cn/info/1425/3577.htm' },
    { id: 'digital-329', title: '数字敦煌：第329窟藻井与四披', url: 'https://www.e-dunhuang.com/cave/10.0001/0001.0001.0329' },
    { id: 'photo-329', title: '中国工艺美术学会：第329窟藻井，吴健摄影、敦煌研究院供图', url: 'https://www.cnacs.net.cn/18/202209/4028.html' },
    { id: 'cave-254', title: '敦煌研究院：莫高窟第254窟（北魏）', url: 'https://www.dha.ac.cn/info/1425/3685.htm' },
    { id: 'digital-254', title: '数字敦煌：第254窟平棋顶与龛楣', url: 'https://www.e-dunhuang.com/cave/10.0001/0001.0001.0254' },
    { id: 'digital-257', title: '数字敦煌：第257窟平棋、莲花与忍冬', url: 'https://www.e-dunhuang.com/cave/10.0001/0001.0001.0257' },
    { id: 'cave-401', title: '敦煌研究院：莫高窟第401窟（隋）', url: 'https://www.dha.ac.cn/info/1425/3601.htm' },
    { id: 'cave-407', title: '敦煌研究院：莫高窟第407窟（隋）', url: 'https://www.dha.ac.cn/info/1425/3569.htm' },
    { id: 'rabbits-photo', title: '新华社：敦煌研究院供图的第407窟三兔共耳局部', url: 'https://www.xinhuanet.com/2023-01/23/c_1129308686.htm' },
    { id: 'borders-407', title: '《敦煌研究》编辑部：第407窟藻井，敦煌研究院文物数字化研究所摄影', url: 'https://www.sohu.com/a/421884090_120116137' },
    { id: 'cave-201', title: '敦煌研究院：莫高窟第201窟（中唐）', url: 'https://www.dha.ac.cn/info/1425/3581.htm' },
    { id: 'pigment-aging', title: '苏伯民：敦煌壁画制作材料和工艺分析技术发展概况（中国科学院学部）', url: 'https://academics.casad.cas.cn/xshd/kxyjsqylt/2021/d123c/202111/t20211103_5019033.html' },
    { id: 'pigment-analysis', title: '中国科学院上海光机所：第465窟壁画颜料的光谱分析', url: 'https://siom.cas.cn/xwzx/zhxw/201208/t20120830_3635828.html' },
    { id: 'pigment-colors', title: '敦煌研究院：李最雄的岩壁丹心（颜料稳定性研究）', url: 'https://www.dha.ac.cn/info/1021/7486.htm' },
    { id: 'user-254', title: '用户提供：第254窟平棋局部（原图出版出处待补）', url: '/assets/lessons/patterns/lesson-user-254-ceiling-v001.png' },
    { id: 'user-rabbits', title: '补充资料：用户提供三兔共耳拼版（原拼版出处待补）', url: '/assets/lessons/patterns/lesson-user-rabbits-v001.png' },
  ],
  units: [
    {
      id: 'locations', kind: 'locations', tabLabel: '装饰部位', title: '纹样装饰在哪里？',
      panels: [
        {
          id: 'caisson', label: '藻井', title: '藻井｜窟顶中央的装饰',
          body: '藻井位于窟顶中央。第329窟以层层方框围住莲花井心，四身飞天绕花同向飞旋，外圈再接不同边带。',
          imageAssetId: 'lesson-329-interior', imageCaption: '实物照片｜莫高窟第329窟，初唐。敦煌研究院：西壁佛龛龛顶及窟顶藻井。',
          sourceIds: ['classification', 'cave-329', 'digital-329'],
          highlights: [{ x: 0.20, y: 0.15, width: 0.61, height: 0.38 }],
        },
        {
          id: 'flat-ceiling', label: '平棋', title: '平棋｜平顶上的成组方格',
          body: '平棋是平顶上的方格装饰。第254窟后部以转角套叠的方框连续铺展，中央绘莲花，三角叉角处安排飞天、忍冬或火焰纹。',
          imageAssetId: 'lesson-user-254-ceiling', imageCaption: '实物局部｜莫高窟第254窟，北魏。用户提供；结构与官方资料对照，原图片出版出处待补。',
          sourceIds: ['digital-254', 'cave-254', 'user-254'],
          highlights: [{ x: 0.02, y: 0.09, width: 0.47, height: 0.80 }, { x: 0.53, y: 0.11, width: 0.45, height: 0.79 }],
        },
        {
          id: 'niche-lintel', label: '龛楣', title: '龛楣｜佛龛开口上方的装饰',
          body: '龛楣位于佛龛开口上方。第254窟南壁的阙形龛兼用泥塑和彩绘，龛楣绘忍冬；这种叶形纹样也能出现在平棋和边带中。',
          imageAssetId: 'lesson-254-niche', imageCaption: '实物照片｜莫高窟第254窟，北魏，南壁前部阙形龛。敦煌研究院。',
          sourceIds: ['cave-254', 'digital-254'],
        },
        {
          id: 'borders', label: '边饰', title: '边饰｜沿画面边缘排列的装饰',
          body: '边饰沿画面或建筑部位的边缘展开。第401窟外圈把禽鸟放在联珠圈中，圆圈接续成带，衬托中央莲花。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，莲花飞天藻井。敦煌研究院。',
          sourceIds: ['classification', 'cave-401'],
          highlights: [{ x: 0.27, y: 0.12, width: 0.48, height: 0.12 }],
        },
      ],
    },
    {
      id: 'motifs', kind: 'motifs', tabLabel: '花叶纹样', title: '花与叶怎样成为纹样？',
      panels: [
        {
          id: 'lotus', label: '莲花', title: '莲花｜花瓣围绕中心展开',
          body: '第329窟以花瓣围绕花心、层层展开，形成一朵大莲花。方井四角各画四分之一团花，与中央花形相呼应。',
          imageAssetId: 'lesson-329-center', imageCaption: '实物照片局部｜莫高窟第329窟，初唐。吴健摄影，敦煌研究院供图，中国工艺美术学会刊载。',
          sourceIds: ['photo-329', 'digital-329', 'cave-329'],
          highlights: [{ x: 0.23, y: 0.27, width: 0.49, height: 0.48 }],
        },
        {
          id: 'honeysuckle', label: '忍冬', title: '忍冬｜翻卷、分叉的叶形',
          body: '忍冬纹常见分叉、向两侧翻卷的叶形。第254窟平棋的三角叉角内，深色叶形左右展开，顺应边框组合成对称图案。',
          imageAssetId: 'lesson-user-254-ceiling', imageCaption: '实物局部｜莫高窟第254窟，北魏。用户提供；结构与官方资料对照，原图片出版出处待补。',
          sourceIds: ['digital-254', 'cave-254', 'user-254'],
          focus: { x: 0.16, y: 0.107, width: 0.19, height: 0.214 },
          highlights: [{ x: 0.19, y: 0.12, width: 0.15, height: 0.15 }],
        },
        {
          id: 'scroll', label: '卷草', title: '卷草｜花叶顺着茎蔓延展',
          body: '卷草沿弯曲的茎蔓连接叶片或花朵，形成连续舒展的曲线。第329窟藻井周围的窄边带里，枝叶一组接一组延伸。',
          imageAssetId: 'lesson-329-ceiling', imageCaption: '实物照片｜莫高窟第329窟，初唐，藻井及周缘装饰。吴健摄影，敦煌研究院供图，中国工艺美术学会刊载。',
          sourceIds: ['photo-329', 'cave-329', 'cave-201'],
          focus: { x: 0.25, y: 0.265, width: 0.50, height: 0.105 },
          highlights: [{ x: 0.27, y: 0.285, width: 0.46, height: 0.065 }],
        },
      ],
    },
    {
      id: 'geometry', kind: 'geometry', tabLabel: '几何纹样', title: '几何纹样怎样形成秩序？',
      panels: [
        {
          id: 'beads', label: '联珠', title: '联珠｜小珠连成圆形边框',
          body: '联珠把珠点连成圆圈或边框。第401窟的珠圈里画有鸟，多个珠圈相接，形成禽鸟联珠纹边带。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，禽鸟联珠纹边带。敦煌研究院。',
          sourceIds: ['cave-401'],
          focus: { x: 0.23, y: 0.10, width: 0.55, height: 0.16 },
        },
        {
          id: 'diamonds', label: '菱格', title: '菱格｜斜线围成菱形框格',
          body: '第407窟莲花井心外侧，斜线围成菱形框格，格内再填花叶。相邻单元沿边带反复接续，构成菱格莲花纹。',
          imageAssetId: 'lesson-407-borders', imageCaption: '实物照片｜莫高窟第407窟，隋。敦煌研究院文物数字化研究所摄影，《敦煌研究》编辑部提供。',
          sourceIds: ['cave-407', 'borders-407'],
          focus: { x: 0.20, y: 0.18, width: 0.61, height: 0.12 },
          highlights: [{ x: 0.23, y: 0.19, width: 0.53, height: 0.06 }],
        },
        {
          id: 'meander', label: '回纹', title: '回纹｜方折回转的连续线条',
          body: '回纹用方折回转的线条连续接续，常组成窄边带。第201窟藻井周围使用回纹、卷草等装饰，多层边带围住中心图案。',
          imageAssetId: 'lesson-201-ceiling', imageCaption: '实物照片｜莫高窟第201窟，中唐，石榴茶花纹藻井。敦煌研究院原图450×304，仅作整体层次观察。',
          sourceIds: ['cave-201'],
        },
      ],
    },
    {
      id: 'animals', kind: 'animals', tabLabel: '动物纹样', title: '三只兔子，几只耳朵？',
      panels: [
        {
          id: 'three-rabbits', label: '三兔共耳', title: '三兔共耳｜三只兔子共用耳朵',
          body: '第407窟莲花中心有三只同向奔跑的兔子。它们共用三只耳朵，每只兔子看起来却都有两只；三耳在中央组成三角形。',
          imageAssetId: 'lesson-407-rabbits', imageCaption: '实物照片｜莫高窟第407窟，隋，藻井井心局部。敦煌研究院供图，新华社刊载。',
          sourceIds: ['cave-407', 'rabbits-photo'],
          focus: { x: 0.30, y: 0.29, width: 0.41, height: 0.42 },
          highlights: [{ x: 0.43, y: 0.43, width: 0.17, height: 0.15 }],
        },
        {
          id: 'birds', label: '禽鸟纹', title: '禽鸟纹｜把鸟画进联珠圈',
          body: '第401窟把鸟画进一圈圈联珠框中。先看鸟的形象，再沿边带找相似单元，就能看清动物题材如何与几何框架结合。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，禽鸟联珠纹。敦煌研究院。',
          sourceIds: ['cave-401'],
          focus: { x: 0.34, y: 0.12, width: 0.30, height: 0.13 },
        },
      ],
    },
    {
      id: 'composition', kind: 'composition', tabLabel: '组织方式', title: '同样的纹样，怎样组织？',
      panels: [
        {
          id: 'round-flower', label: '团花', title: '团花｜花叶围绕一个中心',
          body: '团花把花叶围绕一个中心组织成近圆形图案。第329窟中央大团花层层展开，四角的局部花形与之呼应。',
          imageAssetId: 'lesson-329-center', imageCaption: '实物照片局部｜莫高窟第329窟，初唐。吴健摄影，敦煌研究院供图，中国工艺美术学会刊载。',
          sourceIds: ['photo-329', 'digital-329'],
          highlights: [{ x: 0.23, y: 0.27, width: 0.49, height: 0.48 }],
        },
        {
          id: 'repeat', label: '连续', title: '连续｜相似单元反复接续',
          body: '相似单元沿一个方向反复接续，形成连续装饰。第401窟的禽鸟珠圈一圈接一圈，铺成绕井心的边带。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，连续排列的禽鸟联珠纹边带。敦煌研究院。',
          sourceIds: ['cave-401', 'digital-254'],
          highlights: [{ x: 0.26, y: 0.12, width: 0.49, height: 0.12 }],
        },
        {
          id: 'rotation', label: '旋转', title: '旋转｜围绕中心形成动势',
          body: '第329窟四身飞天围着莲花同向飞旋，飘带和云纹增强了运动感。第407窟三只兔子也围着中心同向排列。它们题材不同，却都借围绕中心的方向关系形成旋转动势。',
          imageAssetId: 'lesson-329-center', imageCaption: '实物照片局部｜莫高窟第329窟，初唐，莲花周围的四身飞天。吴健摄影，敦煌研究院供图。',
          sourceIds: ['photo-329', 'cave-329', 'digital-329', 'cave-407'],
          highlights: [{ x: 0.06, y: 0.04, width: 0.87, height: 0.91 }],
        },
      ],
    },
    {
      id: 'colors', kind: 'colors', tabLabel: '色彩', title: '色彩怎样形成层次？',
      panels: [
        {
          id: 'contrast', label: '青绿与暖色', title: '青绿与暖色｜用冷暖衬托中心', swatch: '#4f9094',
          body: '这张第329窟照片里，青蓝井心偏冷，红赭外圈偏暖。相邻的冷暖色互相衬托，让中心与边带更容易分清。',
          imageAssetId: 'lesson-329-ceiling', imageCaption: '实物照片｜第329窟。吴健摄影，敦煌研究院供图。照片显示拍摄与显示条件下的色彩，不等于初唐原始配色。',
          sourceIds: ['photo-329', 'cave-329', 'pigment-aging'],
          highlights: [{ x: 0.35, y: 0.29, width: 0.29, height: 0.44 }],
        },
        {
          id: 'layers', label: '明暗与层次', title: '明暗与层次｜用深浅分出内外', swatch: '#e5d4b2',
          body: '第401窟浅色边带、青绿色背景和深色莲瓣相邻，形成明暗层次，突出中心与外圈。现存深色也可能受颜料老化影响。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜第401窟现存莲花飞天藻井。色彩与变色判断须结合材料分析。',
          sourceIds: ['cave-401', 'pigment-aging'],
        },
        {
          id: 'evidence', label: '颜料与时间', title: '颜料与时间｜材料会老化变色',
          body: '石青、青金石常用于蓝色，石绿用于绿色，朱砂用于红色。具体颜料须通过光谱等检测辨认；材料老化会变色，照片取色不能还原原始配方。',
          imageAssetId: 'lesson-329-center', imageCaption: '图示为第329窟，非第465窟检测样点。颜料研究依据中国科学院与敦煌研究院的检测报道。',
          sourceIds: ['photo-329', 'pigment-analysis', 'pigment-aging', 'pigment-colors', 'digital-329'],
        },
      ],
    },
    {
      id: 'review', kind: 'review', tabLabel: '知识小考', title: '知识小考',
      panels: [
        {
          id: 'review-summary', label: '观察回顾', title: '观察回顾｜部位、纹样与排列',
          body: '第329窟把莲花画在藻井中央，再用旋转的飞天与连续边带围绕它。部位、纹样、排列与色彩，可以结合起来观察。',
          imageAssetId: 'lesson-329-ceiling', imageCaption: '实物照片｜莫高窟第329窟，初唐。吴健摄影，敦煌研究院供图。游戏关卡另用AI教学示意。',
          sourceIds: ['photo-329', 'cave-329', 'digital-329', 'classification'],
        },
      ],
      questions: [
        {
          id: 'review-location', prompt: '第254窟平顶上成组、连续绘出的方格装饰，称为什么？',
          options: ['藻井', '平棋', '龛楣'], correctIndex: 1,
          feedback: '这是平棋。它在平顶上成组铺展；藻井突出窟顶中央，龛楣则位于佛龛开口上方。',
        },
        {
          id: 'review-motifs', prompt: '莲花、忍冬、卷草的形态，哪一组对应正确？',
          options: [
            '莲花：花瓣围绕花心；忍冬：叶形分叉翻卷；卷草：花叶沿弯曲茎蔓延展',
            '莲花：叶形分叉翻卷；忍冬：花叶沿弯曲茎蔓延展；卷草：花瓣围绕花心',
            '莲花：花叶沿弯曲茎蔓延展；忍冬：花瓣围绕花心；卷草：叶形分叉翻卷',
          ], correctIndex: 0,
          feedback: '先看主要轮廓：莲花有围绕花心的花瓣，忍冬突出翻卷分叉的叶形，卷草则用弯曲茎蔓连接花叶。',
        },
        {
          id: 'review-evidence', prompt: '联珠纹与菱格纹的主要区别，哪项正确？',
          options: ['联珠用斜线围出菱形，菱格用珠点排成圆圈', '两者都只表示中央的一朵莲花', '联珠以珠点组成边框，菱格以斜线围成菱形框格'], correctIndex: 2,
          feedback: '联珠看一粒粒相连的珠点；菱格看斜线围成的菱形框格。框内可以再画鸟、花叶等不同题材。',
        },
        {
          id: 'count-rabbit-ears', prompt: '第407窟的三兔共耳图中，实际画了几只共用的耳朵？',
          options: ['3只', '6只', '9只'], correctIndex: 0,
          feedback: '实际只有3只耳朵。每只兔子各借用相邻的两只耳朵，看起来都双耳齐全；三耳在中央组成三角形。',
        },
        {
          id: 'review-organization', prompt: '飞天绕莲花同向飞行，珠圈沿边带反复出现，分别体现哪种组织方式？',
          options: ['旋转与连续', '连续与团花', '团花与旋转'], correctIndex: 0,
          feedback: '围绕同一中心、方向一致，形成旋转动势；相似单元沿边带反复接续，形成连续装饰。',
        },
        {
          id: 'photo-and-pigment', prompt: '观察第329窟照片中的青蓝、红赭和深浅变化，哪种说法正确？',
          options: ['青蓝偏暖、红赭偏冷，照片取色就是原始颜料配方', '青蓝偏冷、红赭偏暖，深浅形成层次；具体颜料还需检测', '所有深色都说明当年用了同一种黑颜料'], correctIndex: 1,
          feedback: '冷暖和明暗关系帮助分清画面层次。具体颜料还须检测，材料老化、拍摄与屏幕都会影响今天看到的颜色。',
        },
      ],
    },
  ],
};
