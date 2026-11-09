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
    { id: 'cave-254', title: '敦煌研究院：莫高窟第254窟（北魏）', url: 'https://www.dha.ac.cn/info/1425/3685.htm' },
    { id: 'digital-254', title: '数字敦煌：第254窟平棋顶与龛楣', url: 'https://www.e-dunhuang.com/cave/10.0001/0001.0001.0254' },
    { id: 'digital-257', title: '数字敦煌：第257窟平棋、莲花与忍冬', url: 'https://www.e-dunhuang.com/cave/10.0001/0001.0001.0257' },
    { id: 'cave-401', title: '敦煌研究院：莫高窟第401窟（隋）', url: 'https://www.dha.ac.cn/info/1425/3601.htm' },
    { id: 'cave-407', title: '敦煌研究院：莫高窟第407窟（隋）', url: 'https://www.dha.ac.cn/info/1425/3569.htm' },
    { id: 'rabbits-photo', title: '新华社：敦煌研究院供图的第407窟三兔共耳局部', url: 'https://www.xinhuanet.com/2023-01/23/c_1129308686.htm' },
    { id: 'cave-201', title: '敦煌研究院：莫高窟第201窟（中唐）', url: 'https://www.dha.ac.cn/info/1425/3581.htm' },
    { id: 'pigment-aging', title: '苏伯民：敦煌壁画制作材料和工艺分析技术发展概况（中国科学院学部）', url: 'https://academics.casad.cas.cn/xshd/kxyjsqylt/2021/d123c/202111/t20211103_5019033.html' },
    { id: 'pigment-analysis', title: '中国科学院上海光机所：第465窟壁画颜料的光谱分析', url: 'https://siom.cas.cn/xwzx/zhxw/201208/t20120830_3635828.html' },
    { id: 'pigment-colors', title: '敦煌研究院：李最雄的岩壁丹心（颜料稳定性研究）', url: 'https://www.dha.ac.cn/info/1021/7486.htm' },
    { id: 'user-254', title: '用户提供：第254窟平棋局部（原图出版出处待补）', url: '/assets/lessons/patterns/lesson-user-254-ceiling-v001.png' },
    { id: 'user-honeysuckle', title: '补充资料：用户提供忍冬整理图（窟号、年代与原出处待核）', url: '/assets/lessons/patterns/lesson-user-honeysuckle-v001.png' },
    { id: 'user-rabbits', title: '补充资料：用户提供三兔共耳拼版（原拼版出处待补）', url: '/assets/lessons/patterns/lesson-user-rabbits-v001.png' },
  ],
  units: [
    {
      id: 'locations', kind: 'locations', title: '纹样装饰在哪里？',
      lead: '先看部位，再认图案。藻井、平棋、龛楣、边饰，说的是不同的装饰位置与用途。',
      panels: [
        {
          id: 'caisson', label: '藻井', title: '窟顶中央的装饰重点',
          body: '藻井位于窟顶中央，常以层层套叠的方框和中心图案形成视觉重点。第329窟的井心是一朵大莲花，四身飞天围绕它同向飞旋；外围还有不同层次的边带。',
          imageAssetId: 'lesson-329-interior', imageCaption: '实物照片｜莫高窟第329窟，初唐。敦煌研究院：西壁佛龛龛顶及窟顶藻井。',
          sourceIds: ['classification', 'cave-329', 'digital-329'],
          highlights: [{ x: 0.20, y: 0.15, width: 0.61, height: 0.38 }],
        },
        {
          id: 'flat-ceiling', label: '平棋', title: '平顶上的成组方格',
          body: '平棋是平顶上的方格装饰。第254窟后部的平顶绘有连续的斗四套叠方格：方形层层转折套入，中央绘莲花，叉角处安排飞天、忍冬或火焰纹。它与突出中央的藻井有所区别。',
          imageAssetId: 'lesson-user-254-ceiling', imageCaption: '实物局部｜莫高窟第254窟，北魏。用户提供；结构与官方资料对照，原图片出版出处待补。',
          sourceIds: ['digital-254', 'cave-254', 'user-254'],
          highlights: [{ x: 0.02, y: 0.09, width: 0.47, height: 0.80 }, { x: 0.53, y: 0.11, width: 0.45, height: 0.79 }],
        },
        {
          id: 'niche-lintel', label: '龛楣', title: '佛龛上沿也有纹样',
          body: '龛楣是佛龛开口上部的装饰部位，不是一种花。第254窟南壁的阙形龛兼用泥塑和彩绘，龛楣绘忍冬。相同的忍冬纹样也能出现在平棋和边带中。',
          imageAssetId: 'lesson-254-niche', imageCaption: '实物照片｜莫高窟第254窟，北魏，南壁前部阙形龛。敦煌研究院。',
          sourceIds: ['cave-254', 'digital-254'],
        },
        {
          id: 'borders', label: '边饰', title: '把画面分隔并连接起来',
          body: '边饰沿画面、井心或建筑部位的边缘展开，用来分界、衬托和连接。第401窟莲花飞天藻井的外圈排列禽鸟联珠纹：圆形珠圈里有鸟，多个圆圈连续成带。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，莲花飞天藻井。敦煌研究院。',
          sourceIds: ['classification', 'cave-401'],
          highlights: [{ x: 0.27, y: 0.12, width: 0.48, height: 0.12 }],
        },
      ],
    },
    {
      id: 'motifs', kind: 'motifs', title: '花与叶怎样成为纹样？',
      lead: '莲花、忍冬、卷草描述图案的内容与形态，同一种纹样可以装饰不同部位。',
      panels: [
        {
          id: 'lotus', label: '莲花', title: '花瓣围绕中心层层展开',
          body: '莲花是敦煌石窟常见的装饰题材。第329窟把莲瓣组织成一朵大团花，并在方井四角安排与中心呼应的四分之一团花。看花心、花瓣和角花，就能发现中心与四角的联系。',
          imageAssetId: 'lesson-329-center', imageCaption: '实物照片｜莫高窟第329窟，初唐，莲花飞天藻井井心。数字敦煌公开预览，保留水印。',
          sourceIds: ['digital-329', 'cave-329'],
          focus: { x: 0.25, y: 0.25, width: 0.50, height: 0.50 },
        },
        {
          id: 'honeysuckle', label: '忍冬', title: '翻卷、分叉的叶形',
          body: '忍冬是装饰纹样的传统名称，叶形常分叉、翻卷，能成对组合，也能连续排列。第257窟平棋的官方记录明确提到忍冬装饰；这里看的是程式化的叶形，不能当作植物写生图。',
          imageAssetId: 'lesson-257-ceiling', imageCaption: '实物照片｜莫高窟第257窟，北魏，残存平棋。数字敦煌公开预览，原有黑区与水印保留。',
          sourceIds: ['digital-257'],
          focus: { x: 0.34, y: 0.68, width: 0.40, height: 0.19 },
          highlights: [{ x: 0.39, y: 0.70, width: 0.28, height: 0.15 }],
        },
        {
          id: 'scroll', label: '卷草', title: '顺着曲线生长的枝叶',
          body: '卷草以弯曲延展的茎蔓连接叶片或花朵，重点在连续舒展的曲线。第329窟藻井周围有卷草纹边带；第201窟的官方记录也列有卷草与回纹。它不等于“画了叶子”的所有图案。',
          imageAssetId: 'lesson-329-ceiling', imageCaption: '实物照片｜莫高窟第329窟，初唐，藻井及周缘装饰。敦煌研究院。',
          sourceIds: ['cave-329', 'cave-201'],
          highlights: [{ x: 0.24, y: 0.21, width: 0.53, height: 0.06 }],
        },
      ],
    },
    {
      id: 'geometry', kind: 'geometry', title: '几何纹样怎样形成秩序？',
      lead: '圆、菱形和方折线，能通过排列与套叠组成清晰的装饰边界。',
      panels: [
        {
          id: 'beads', label: '联珠', title: '小珠连成圆圈',
          body: '联珠由一粒粒珠点相接构成，常组成圆形边框。第401窟的禽鸟联珠纹把鸟放在珠圈里面，再将珠圈连续排列：外圈是几何框架，内部则是动物形象。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，禽鸟联珠纹边带。敦煌研究院。',
          sourceIds: ['cave-401'],
          focus: { x: 0.23, y: 0.10, width: 0.55, height: 0.16 },
        },
        {
          id: 'diamonds', label: '菱格', title: '菱形连续成带',
          body: '菱格用斜向交错或连续排列的菱形形成格状秩序。图中平棋下沿能看到蓝色小菱形的连续边带。中央的大方形套叠属于另一种几何组织，不要把所有转了角的方框都叫作菱格。',
          imageAssetId: 'lesson-257-ceiling', imageCaption: '实物照片｜莫高窟第257窟，北魏，平棋边带局部。数字敦煌。',
          sourceIds: ['digital-257'],
          focus: { x: 0.21, y: 0.84, width: 0.36, height: 0.13 },
          highlights: [{ x: 0.22, y: 0.87, width: 0.33, height: 0.07 }],
        },
        {
          id: 'meander', label: '回纹', title: '方折回转的连续线条',
          body: '回纹以方折、回转的线条反复接续，常用于窄边带。敦煌研究院记录第201窟藻井周缘使用了回纹、卷草等边饰。不同宽窄的几何与花叶边带，一层层把中心衬托出来。',
          imageAssetId: 'lesson-201-ceiling', imageCaption: '实物照片｜莫高窟第201窟，中唐，石榴茶花纹藻井。敦煌研究院原图450×304，仅作整体层次观察。',
          sourceIds: ['cave-201'],
        },
      ],
    },
    {
      id: 'animals', kind: 'animals', title: '三只兔子，几只耳朵？',
      lead: '动物形象也能成为纹样。先看兔子的身体，再沿着头部寻找耳朵。',
      panels: [
        {
          id: 'three-rabbits', label: '三兔共耳', title: '三只兔子围着中心奔跑',
          body: '第407窟三兔莲花飞天藻井的莲花中心画着三只兔子。它们首尾相接、同向奔跑，身体分开，耳朵却共用。沿着每只兔子的头部观察，会发现三条耳形组成了三角形。',
          imageAssetId: 'lesson-407-rabbits', imageCaption: '实物照片｜莫高窟第407窟，隋，藻井井心局部。敦煌研究院供图，新华社刊载。',
          sourceIds: ['cave-407', 'rabbits-photo'],
          focus: { x: 0.30, y: 0.29, width: 0.41, height: 0.42 },
          highlights: [{ x: 0.43, y: 0.43, width: 0.17, height: 0.15 }],
        },
        {
          id: 'birds', label: '禽鸟纹', title: '鸟也可以进入几何框架',
          body: '第401窟把鸟放进联珠圈中，形成禽鸟联珠纹。观察时可以分两层：先辨认圈里的动物，再看圆圈怎样连接。纹样的题材与它的排列方式，需要分开描述。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，禽鸟联珠纹。敦煌研究院。',
          sourceIds: ['cave-401'],
          focus: { x: 0.34, y: 0.12, width: 0.30, height: 0.13 },
        },
      ],
      question: {
        id: 'count-rabbit-ears', prompt: '三兔共耳图中，实际画了几只共用的耳朵？',
        options: ['3只', '6只', '9只'], correctIndex: 0,
        feedback: '实际只有3只耳朵。每只兔子各借用相邻的两只耳朵，看起来却都双耳齐全；共用轮廓让图案紧凑而巧妙。',
      },
    },
    {
      id: 'composition', kind: 'composition', title: '同样的纹样，怎样组织？',
      lead: '题材回答“画什么”，组织方式回答“怎样排列”。团花、连续、旋转可以出现在同一幅装饰里。',
      panels: [
        {
          id: 'round-flower', label: '团花', title: '花瓣围绕一个中心',
          body: '团花把花叶等元素集中组织在近圆形的范围内。第329窟中心大团花层层向外展开，四角的四分之一团花与它呼应。“莲花”说题材，“团花”说组织，它们并不互相排斥。',
          imageAssetId: 'lesson-329-center', imageCaption: '实物照片｜莫高窟第329窟，初唐，藻井井心。数字敦煌。',
          sourceIds: ['digital-329'],
          highlights: [{ x: 0.28, y: 0.27, width: 0.47, height: 0.48 }],
        },
        {
          id: 'repeat', label: '连续', title: '沿着边缘反复排列',
          body: '一个基本单元沿带状区域反复排列，就能形成连续装饰。第401窟的禽鸟珠圈一圈接一圈；第254窟的平棋则以套叠方格成组铺展。单元相似，所在部位和展开方向可以不同。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜莫高窟第401窟，隋，连续排列的禽鸟联珠纹边带。敦煌研究院。',
          sourceIds: ['cave-401', 'digital-254'],
          highlights: [{ x: 0.26, y: 0.12, width: 0.49, height: 0.12 }],
        },
        {
          id: 'rotation', label: '旋转', title: '围绕中心形成动势',
          body: '第329窟四身飞天围着莲花同向飞旋，飘带和云纹增强了运动感。第407窟三只兔子也围着中心同向排列。它们题材不同，却都借围绕中心的方向关系形成旋转动势。',
          imageAssetId: 'lesson-329-center', imageCaption: '实物照片｜莫高窟第329窟，初唐，莲花周围的四身飞天。数字敦煌。',
          sourceIds: ['cave-329', 'digital-329', 'cave-407'],
          highlights: [{ x: 0.17, y: 0.16, width: 0.67, height: 0.68 }],
        },
      ],
    },
    {
      id: 'colors', kind: 'colors', title: '看色彩，也看证据',
      lead: '从今天的图像观察冷暖、明暗与层次；讨论颜料和原貌时，需要另外的科学证据。',
      panels: [
        {
          id: 'contrast', label: '青绿与暖色', title: '青绿与暖色相互衬托', swatch: '#4f9094',
          body: '在第329窟这张照片中，偏青蓝的井心与周围偏红赭的区域形成冷暖对比。观察色彩时，先比较相邻区域的关系：哪一块更冷、哪一块更暖，哪一层把中心衬得更醒目。',
          imageAssetId: 'lesson-329-ceiling', imageCaption: '实物照片｜第329窟现存壁画影像。照片显示的是今日拍摄与显示条件下的色彩，不等于初唐原始配色。',
          sourceIds: ['cave-329', 'pigment-aging'],
          highlights: [{ x: 0.35, y: 0.29, width: 0.29, height: 0.44 }],
        },
        {
          id: 'layers', label: '明暗与层次', title: '浅色、深色也参与构图', swatch: '#e5d4b2',
          body: '第401窟照片里，浅色边带、青绿色背景与深色莲瓣相邻，能帮助我们分清中心与外圈。今天看到的深色还可能与材料老化有关，不能仅凭“看起来黑”就认定画工当年用了黑颜料。',
          imageAssetId: 'lesson-401-ceiling', imageCaption: '实物照片｜第401窟现存莲花飞天藻井。色彩与变色判断须结合材料分析。',
          sourceIds: ['cave-401', 'pigment-aging'],
        },
        {
          id: 'evidence', label: '颜料与时间', title: '颜色背后有不同的材料',
          body: '石青、青金石能提供蓝色，石绿能提供绿色，朱砂能提供红色；不同洞窟和时期的用材并不完全相同。辨认原作中的具体颜料，需要拉曼光谱、X射线荧光等检测。材料还可能老化变色，因此照片里的颜色不直接等于最初的配色。',
          imageAssetId: 'lesson-329-center', imageCaption: '图示为第329窟，非第465窟检测样点。颜料研究依据中国科学院与敦煌研究院的检测报道。',
          sourceIds: ['pigment-analysis', 'pigment-aging', 'pigment-colors', 'digital-329'],
        },
      ],
      question: {
        id: 'photo-and-pigment', prompt: '看到照片中的绿色，能直接断定用了哪一种颜料吗？',
        options: ['能，绿色一定是石绿', '不能，还需要材料检测和研究', '能，屏幕取色就是原始配方'], correctIndex: 1,
        feedback: '不能仅凭照片定颜料。材料老化、拍摄光照和屏幕显示都会影响颜色，具体颜料需要针对原作做科学检测。',
      },
    },
    {
      id: 'review', kind: 'review', title: '换一种方法看纹样',
      lead: '回顾三个观察角度：装饰在哪里、画了什么、怎样组织。选完看看解释，就能继续探索。',
      panels: [
        {
          id: 'review-summary', label: '观察回顾', title: '部位 · 题材 · 组织',
          body: '以第329窟为例：“藻井”指出装饰部位，“莲花”指出中心题材，“团花与旋转”描述组织方式。再比较照片里的色彩关系，就能把观察说得具体；AI游戏示意则不能反过来作为实物考据证据。',
          imageAssetId: 'lesson-329-ceiling', imageCaption: '实物照片｜莫高窟第329窟，初唐。游戏关卡另用AI教学示意，二者分开标注。',
          sourceIds: ['cave-329', 'digital-329', 'classification'],
        },
      ],
      questions: [
        {
          id: 'review-location', prompt: '“藻井”和“莲花”分别在说什么？',
          options: ['都是植物名称', '藻井说装饰部位，莲花说图案题材', '都是同一种排列方法'], correctIndex: 1,
          feedback: '藻井说的是窟顶装饰部位；莲花说画了什么。莲花也能画在平棋、边带等其他位置。',
        },
        {
          id: 'review-organization', prompt: '一圈圈禽鸟联珠纹沿边带反复排列，主要体现哪种组织方式？',
          options: ['连续排列', '只画一个独立中心', '任意散放'], correctIndex: 0,
          feedback: '相似单元沿边带重复接续，形成连续排列。鸟是题材，联珠是框架，连续是组织方式。',
        },
        {
          id: 'review-evidence', prompt: '哪一种说法更有依据？',
          options: ['AI图里的每件乐器都能证明真实洞窟原貌', '照片中的所有深色都一定是原来的黑颜料', '照片可用于观察，具体颜料与原貌还需研究'], correctIndex: 2,
          feedback: '实物影像、材料检测和AI教学示意提供的信息不同。观察要具体，判断原貌与材料时也要说明证据的边界。',
        },
      ],
    },
  ],
};
