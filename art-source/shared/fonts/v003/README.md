# 找物章节目标字体 v003

运行字族仍为`Dunhuang Labels`。本轮从v001已归档霞鹜文楷Regular原TTF中提取87个唯一字符，覆盖34个目标组名称、三章标题、准备页固定文案、乘号与0至9数字。具体字集和输入名称见`source-notes.json`及`subset-characters.txt`。

新运行文件为`public/assets/shared/fonts/dunhuang-labels-v002.woff`；v001母字体、OFL、首页五字字体及v002归档/运行dunhuang-labels-v001.woff全部保留。没有下载、安装系统字体、改动原字形或制作新的Bold字形。

字体真实为Regular（weight400）；界面700仍通过已声明的CSS `font-synthesis: weight`合成。内部字族名称与旧版一致，子集唯一标识更新到v002，保留原版权和许可。

重建：`python3 scripts/import-hidden-object-chapter-font.py`；只读验证：加`--check`。脚本在内存重建两次并逐字节比较，核对cmap完整且仅含所列字符、真实Regular标记、字族、版权许可、固定head时间戳及输出大小。任何已存在且不同的新归档/派生文件均拒绝覆盖，须另建版本。
