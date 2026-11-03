"""Hand-positioned, independent bedding and crown contours; no random offsets.

Each layer has its own vertex count and edge directions. Convex volumes give
wide hard faces; the Boolean union preserves the terminating bedding recess.
"""
import bpy, bmesh

PROFILES={
 'left-high-shoulder':{
  'head':[(-53,13,33),(-46,4,35),(-33,3,36),(-21,10,34),(-20,23,33),(-29,38,34),(-46,37,35),(-54,25,33)],
  'foot':[(-52,15,30),(-48,5,32),(-37,2,33),(-25,5,31),(-19,18,30),(-25,33,31),(-42,40,32),(-52,29,30)],
  'crown':[(-49,14,52),(-42,9,56.1),(-30,10,57.8),(-23,16,55.4),(-24,29,53.9),(-34,38,55),(-46,35,54),(-51,23,51.5)]},
 'left-front-buttress':{
  'head':[(-56,-1,14),(-48,-14,18.2),(-37,-15,17),(-26,-10,15.8),(-19,-3,14),(-19,10,18),(-28,19,21),(-45,18,19),(-54,11,16)],
  'foot':[(-54,0,12),(-50,-10,14),(-39,-15,14),(-26,-12,13),(-21,0,12),(-25,16,17),(-42,20,17),(-54,10,13)],
  'crown':[(-47,2,31),(-45,-7,39),(-34,-8,43.2),(-25,-3,41.8),(-23,5,39.5),(-29,16,41),(-41,16,38),(-49,9,34)]},
 'left-low-flank':{
  'head':[(-63,10,9),(-59,-3,11),(-51,-6,13),(-45,4,14.5),(-49,19,13),(-59,25,11),(-63,19,10)],
  'foot':[(-62,12,6.5),(-61,1,8),(-55,-3,9),(-48,0,10),(-46,10,11),(-52,22,10),(-61,21,8)],
  'crown':[(-59,12,17),(-57,4,21),(-51,2,26),(-46,8,28),(-50,20,25),(-58,21,21)]},
 'central-backbone':{
  'head':[(-25,13,35),(-14,5,33),(-1,4,33),(14,9,32),(25,18,32),(22,33,34),(7,44,35),(-12,43,36),(-25,30,36)],
  'foot':[(-24,16,31),(-18,6,29),(-5,3,29),(11,6,28),(21,13,28),(25,27,29),(15,40,31),(-1,46,32),(-20,37,33)],
  'crown':[(-21,20,50),(-14,11,49.2),(-1,12,48),(11,14,46.8),(18,24,46),(12,39,47),(-6,42,49.4),(-22,34,51)]},
 'right-swept-face':{
  'head':[(10,7,15),(19,-6,19.6),(32,-8,22),(41,2,21),(43,15,19),(35,31,22),(19,35,24),(7,23,19)],
  'foot':[(9,10,12),(15,-1,15),(26,-8,18),(36,-3,17),(43,10,15),(39,25,18),(26,35,20),(11,29,18)],
  'crown':[(15,15,35),(22,5,39.4),(30,3,42.8),(37,10,37.2),(38,20,33),(28,31,38.5),(17,28,40.7)]},
 'right-long-tail':{
  'head':[(35,13,15),(45,3,14),(56,6,11),(62,15,9),(56,30,12),(43,36,15),(34,26,16)],
  'foot':[(37,14,11),(41,7,10),(51,3,8),(59,10,5.5),(61,21,6),(51,34,10),(38,29,12)],
  'crown':[(37,19,29),(44,12,28),(53,10,24),(58,19,17),(51,29,23),(41,30,28.5)]},
}

def profile_volume(name,foot,top,bottom,bed,lean,lip,mesh,material,boolean):
 def hull(label,points):
  o=mesh(label,points,[],material);bm=bmesh.new();bm.from_mesh(o.data)
  bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
  bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();return o
 if name=='continuous-core':
  crown=[(-57,16,20),(-50,3,26),(-36,-2,30),(-21,2,32),(-9,7,34),(6,8,33),(21,5,30),(37,7,25),(53,15,18),(56,25,17),(49,38,20),(30,44,23),(5,46,27),(-18,43,29),(-42,35,25)]
  return hull(name,[(x,y,bottom) for x,y in foot]+crown)
 profile=PROFILES[name]
 lower=hull(name,[(x,y,bottom) for x,y in foot]+profile['head'])
 upper=hull(name+'-independent-upper-layer',profile['foot']+profile['crown'])
 # Store each layer before union for transparent, editable construction.
 lower_ref=lower.copy();lower_ref.data=lower.data.copy();lower_ref.name=name+'-lower-reference';bpy.context.collection.objects.link(lower_ref);lower_ref.hide_render=True;lower_ref.hide_set(True);lower_ref['constructionOnly']=True
 boolean(lower,upper,'UNION')
 lower['authoredProfiles']='Independent lower head, upper foot and crown; no shared vertical corner chain'
 return lower
