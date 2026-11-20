"""Import the legacy portfolio without losing paragraph/image ordering."""
from pathlib import Path
from html import unescape
from html.parser import HTMLParser
import re,json,shutil
ROOT=Path(__file__).resolve().parents[2]
OLD=ROOT/'website'
NEW=ROOT/'newweb'
source=(OLD/'index.html').read_text()
main=(OLD/'main.js').read_text()
def text(s):return unescape(re.sub('<[^>]+>','',s)).strip()
def first(pattern,s,default=''):
 m=re.search(pattern,s,re.S)
 return m.group(1) if m else default
class Assets(HTMLParser):
 def __init__(self):super().__init__();self.images=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag=='img':self.images.append(d)
  if tag=='a':self.links.append(d.get('href',''))
projects={};report=[]
for key,body in re.findall(r'<article[^>]+data-project-detail="([^"]+)"[^>]*>(.*?)</article>',source,re.S):
 title=text(first(r'<h1[^>]*>(.*?)</h1>',body))
 subtitle=text(first(r'<p class="detail-secondary-title">(.*?)</p>',body))
 typ=text(first(r'<li>Type:\s*(.*?)</li>',body));year=text(first(r'<li>Year:\s*(.*?)</li>',body))
 parsed=Assets();parsed.feed(body)
 for item in parsed.images:
  path=item['src'].removeprefix('./');src=OLD/path;dest=NEW/path
  assert src.is_file(),src
  dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dest)
 thumbnail=first(r'id: "'+key+r'".*?thumbnail: "([^"]+)"',main).removeprefix('./')
 if thumbnail:
  dest=NEW/thumbnail;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(OLD/thumbnail,dest)
 inner=re.sub(r'^\s*<div class="project-detail-inner">','',body)
 inner=re.sub(r'</div>\s*$','',inner)
 inner=re.sub(r'<header class="detail-header">.*?</header>','',inner,flags=re.S)
 inner=inner.replace('./assets/','assets/')
 # Inert legacy placeholder links are not presented as playable videos.
 inner=re.sub(r'<p class="detail-video-link-row">\s*<a[^>]+href="#".*?</a>\s*</p>','',inner,flags=re.S)
 sections=[]
 for section in re.findall(r'<section class="detail-section[^\"]*"[^>]*>(.*?)</section>',inner,re.S):
  sections.append({'title':text(first(r'<h2[^>]*>(.*?)</h2>',section)),'copy':text(first(r'<p class="detail-copy">(.*?)</p>',section))})
 hero=parsed.images[0]
 projects[key]={'title':title,'subtitle':subtitle,'year':year,'type':typ,'hero':{'src':hero['src'].removeprefix('./'),'alt':hero.get('alt',title)},'thumbnail':thumbnail,'sections':sections,'bodyHtml':inner.strip(),'imageCount':len(parsed.images)}
 report.append({'id':key,'title':title,'images':len(parsed.images),'sections':len(sections),'videoLinks':[x for x in parsed.links if x.startswith('http')]})
(NEW/'projects.js').write_text('window.PORTFOLIO_PROJECTS = '+json.dumps(projects,ensure_ascii=False,indent=2)+';\n')
(NEW/'migration-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
