# 找物标签手写字体

运行字族为`Dunhuang Labels`，从v001已归档的霞鹜文楷Regular母字体提取16个字符：`琵琶鼓铃铛×0123456789`。原字体、原许可与首页五字WOFF保留。来源引用、原SHA、字集、输出SHA与具体变换见`source-notes.json`。

本文件是真实Regular（weight 400），没有制作或声称提供独立Bold字形。准备页的700加粗由界面显式启用`font-synthesis: weight`处理。PostScript名称按字体格式要求使用不含空格的`DunhuangLabels-Regular`，字族与显示名称为`Dunhuang Labels`。

重建：`python3 scripts/import-hidden-object-label-font.py`。只读验证：`python3 scripts/import-hidden-object-label-font.py --check`。脚本在内存重建两次并逐字节比较，验证cmap、字族、Regular标记、版权许可及输出大小；不覆盖内容不同的既有派生文件。
