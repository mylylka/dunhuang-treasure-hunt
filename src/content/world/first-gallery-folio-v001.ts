const cave = {
  flat: 'https://www.dha.ac.cn/info/1425/3685.htm',
  beads: 'https://www.dha.ac.cn/info/1425/3601.htm',
  rabbits: 'https://www.dha.ac.cn/info/1425/3569.htm',
  flying: 'https://www.dha.ac.cn/info/1425/3577.htm',
  fruit: 'https://www1.xinhuanet.com/politics/20261003/621786abc78c4b58be17b23abadccfc1/c.html',
  camellia: 'https://www.dha.ac.cn/info/1425/3581.htm',
} as const;

interface Entry {
  id: string;
  title: string;
  context: string;
  text: string;
  image: string;
  caption: string;
  source?: string;
}

interface Chapter {
  title: string;
  introduction: string;
  entries: readonly Entry[];
}

export const FIRST_GALLERY_FOLIO: readonly Chapter[] = [
  {
    title: '纹样从哪里来，装饰在哪里',
    introduction: '纹样是把观察到的形象整理成适合装饰的图案。敦煌画师会取用花叶、果实、禽兽和云气，也会用珠点、格子、回转的折线作骨架。一条边带里往往同时有几种题材。',
    entries: [
      {
        id: 'architecture', title: '窟顶、佛龛与边饰', context: '建筑装饰',
        text: '窟顶中央的藻井聚拢视线，平顶上的平棋用方格成组铺开，龛楣装饰佛龛开口上方。边饰沿壁画或建筑边缘排列，把不同画面分开，也能把一整面墙连成一体。',
        image: 'flat-ceiling', caption: '莫高窟第254窟平棋局部 · 北魏 · 供图', source: cave.flat,
      },
      {
        id: 'surfaces', title: '从佛光到衣边', context: '壁画里的使用场合',
        text: '纹样也画在佛像背光、华盖、衣缘和帘幔上，铺地花砖同样可以成组装饰。看一朵花的位置和排列，就能辨认它是在突出中心，还是在给衣边、伞盖或一幅壁画收边。',
        image: 'niche', caption: '莫高窟第254窟南壁阙形龛 · 北魏 · 敦煌研究院', source: 'https://www.tup.tsinghua.edu.cn/booksCenter/bookpreface?id=00894801',
      },
      {
        id: 'sources', title: '花叶果实与丝路交流', context: '植物纹 · 动物纹 · 几何纹',
        text: '莲花把花瓣围绕花心排列，忍冬突出翻卷分叉的叶形，卷草用弯曲茎蔓连接花叶。葡萄、石榴等题材在丝路交流中进入装饰。鸟可以放进联珠圈，花可以放进菱格，同一套骨架也能换不同的内容。',
        image: 'fruit-209', caption: '第209窟石榴葡萄纹构图 · 供图', source: cave.fruit,
      },
    ],
  },
  {
    title: '借物补画与图案的组织方式',
    introduction: '借物补画找的是轮廓、方向和连接关系。找到莲花、飞鸟和葡萄后，再回看整幅游戏壁画，可以辨认中心、两侧与边带各用了什么排法。',
    entries: [
      {
        id: 'lotus', title: '莲花与团花', context: '围绕中心',
        text: '从花心向外看，几层花瓣依次展开。团花把花叶组织成近圆形，适合做画面中心。中央大花和四角的局部花形互相呼应，能把圆形主体和方形边框接起来。',
        image: 'lotus-329', caption: '第329窟莲花井心局部 · 初唐 · 吴健摄影，敦煌研究院供图', source: cave.flying,
      },
      {
        id: 'birds', title: '飞鸟与对称', context: '先找中线，再看朝向',
        text: '找鸟喙朝向，就能看出两只鸟是否相对。禽鸟也能进入一个个联珠圈，沿边缘反复排列。联珠用珠点构框，菱格用斜线围格，回纹用折线回转，三种边带的节奏不同。',
        image: 'beads-401', caption: '第401窟莲花飞天藻井与禽鸟联珠边饰 · 隋 · 敦煌研究院', source: cave.beads,
      },
      {
        id: 'vines', title: '葡萄藤与连续', context: '顺着藤找重复单元',
        text: '补藤蔓时要把缺口两端的弧线接上。沿一条带子重复，称二方连续。横竖两个方向一起铺展，可以铺成棋格或花砖。回到游戏壁画，看看葡萄枝叶怎样把相隔的果实串成一条装饰。',
        image: 'mural', caption: '第一馆借物补画 · 游戏展陈图',
      },
      {
        id: 'rotation', title: '三兔共耳与旋转', context: '共享轮廓',
        text: '第407窟三只兔子围绕同一中心奔跑。相邻兔子共用一只耳朵，所以图上只画三只耳朵，每只兔子看起来都有两只。旋转让你看到奔跑的方向，共用形让你在同一条轮廓里认出两个部分。',
        image: 'rabbits-detail', caption: '三兔共耳井心 · 第407窟构图 · 供图局部', source: cave.rabbits,
      },
    ],
  },
  {
    title: '仰看藻井',
    introduction: '藻井取意于木构顶部层层收进的装饰。敦煌石窟常把这种层次画在窟顶上。可从中心的井心看起，再数一层层边饰，最后找像帘布垂下来的垂幔。覆斗顶四面斜坡叫四披。平棋是一组铺开的方格，可以和突出中央的藻井对照观察。',
    entries: [
      {
        id: 'classic-401', title: '莲花与联珠圈', context: '莫高窟第401窟 · 隋',
        text: '从井心的莲花看到外圈的禽鸟联珠纹，比较居中的圆形花朵和沿边反复出现的圆圈。这个例子适合辨认单个图案如何变成一条边带。',
        image: 'beads-401', caption: '窟顶照片 · 敦煌研究院', source: cave.beads,
      },
      {
        id: 'classic-407', title: '三兔莲花飞天藻井', context: '莫高窟第407窟 · 隋',
        text: '三兔在莲花中心旋转，飞天在莲花外呼应同一个方向。向外看见菱格花纹和垂幔，能从一幅完整图上辨认井心、边饰与最外圈的关系。',
        image: 'rabbits-full', caption: '供图 · 第407窟构图示意，原图版本未标', source: cave.rabbits,
      },
      {
        id: 'classic-209', title: '石榴葡萄纹藻井', context: '莫高窟第209窟 · 初唐',
        text: '小石榴在中心，葡萄成串围成中圈，露出籽的大石榴分居四角。画师用枝蔓穿过几层果实，让方井里形成一朵由果叶组成的团花。',
        image: 'fruit-209', caption: '供图 · 第209窟构图示意，原图版本未标', source: cave.fruit,
      },
      {
        id: 'classic-329', title: '莲花飞天藻井', context: '莫高窟第329窟 · 初唐',
        text: '莲花在蓝底井心舒展，四身飞天绕它飞旋。飘带与云纹把飞天的方向连起来。从佛龛和窟顶一起看，可以理解藻井如何组织整个洞窟的仰视画面。',
        image: 'interior-329', caption: '第329窟西壁佛龛与窟顶 · 敦煌研究院', source: cave.flying,
      },
      {
        id: 'classic-201', title: '石榴茶花纹藻井', context: '莫高窟第201窟 · 中唐',
        text: '井心以石榴和茶花组成花形，外层用回纹和卷草等边饰围拢。与初唐飞天藻井并排看，可以比较各自突出的是飞旋的人物、果叶团花，还是密集的边饰节奏。',
        image: 'camellia-201', caption: '窟顶照片 · 敦煌研究院', source: cave.camellia,
      },
    ],
  },
  {
    title: '设色、材料与今天的应用',
    introduction: '画架《飞天持莲》用线稿练习设色。先分出主体和背景，再看冷暖、明暗与留白如何改变同一个图案的层次。',
    entries: [
      {
        id: 'color-layers', title: '让主纹与边饰分得清', context: '冷暖与明暗',
        text: '对照第329窟图像，可以看青蓝与红赭相邻时怎样衬出层次。做自己的填色时，可以给最想让人先看的地方更清楚的明暗对比，再用同一两种颜色连接花瓣、衣饰或边带。',
        image: 'lotus-329', caption: '第329窟井心色彩观察 · 吴健摄影，敦煌研究院供图', source: cave.flying,
      },
      {
        id: 'pigment', title: '今天看到的颜色经历了时间', context: '地仗、颜料和变色',
        text: '壁画的颜色画在地仗层上，颜料会随时间和环境变化。石青、石绿、朱砂是可用来了解古代蓝、绿、红的一些材料。看照片可以比较颜色关系，要知道某处用了什么材料，还要看科学检测。',
        image: 'beads-401', caption: '第401窟现存画面 · 作色彩关系观察', source: 'https://academics.casad.cas.cn/xshd/kxyjsqylt/2021/d123c/202111/t20211103_5019033.html',
      },
      {
        id: 'workshop', title: '从画架到书签和织物', context: '观察与改编',
        text: '可以把一个卷草单元沿书签长边重复，或取一个团花作封面的中心。先保留原图最易辨认的轮廓，再为新用途调整疏密和颜色。画架的参考配色用于练习，玩家可以用同一幅线稿做出自己的配色。',
        image: 'easel', caption: '第一馆画架《飞天持莲》 · 教学配色示例',
      },
    ],
  },
];
