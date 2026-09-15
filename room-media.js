(function () {
  "use strict";
  const S = SIPAE, { esc, icon } = S.U;
  const photos = new Map();
  const mayEdit = (room) => !!room && ['diretor','coordenador'].includes(S.state.role);
  function illustration(room) {
    const lab = /laboratório/i.test(room.type), computers = room.resources.includes('Computadores'), workshop = /oficina/i.test(room.type), hall = /auditório/i.test(room.type);
    const wall = workshop ? '#e9e3d9' : lab ? '#dce8ef' : '#e8e5ee';
    const accent = workshop ? '#9b7351' : lab ? '#567d99' : '#7f6c89';
    const desks = [112,204,296,388].map((x) => '<g transform="translate('+x+' 0)"><path d="M-24 122h52l12 16h-76z" fill="'+accent+'"/><path d="M-31 138v19m60-19v19" stroke="#5b6575" stroke-width="4"/>' +
      (computers ? '<rect x="-13" y="98" width="27" height="21" rx="2" fill="#374c60"/><rect x="-10" y="101" width="21" height="15" fill="#a9d6dc"/><path d="M0 119v5" stroke="#374c60" stroke-width="3"/>' : '') +
      '<path d="M-17 155h37l5 14h-47z" fill="#374c60"/></g>').join('');
    return '<svg viewBox="0 0 500 210" aria-hidden="true" focusable="false"><rect width="500" height="210" fill="'+wall+'"/><path d="M0 145h500v65H0z" fill="#cdd4dc"/><path d="M0 145 100 116h400v29" fill="#f5f6f8"/><rect x="42" y="24" width="84" height="70" rx="3" fill="#fafcfd"/><path d="M84 26v66M44 59h80" stroke="'+wall+'" stroke-width="5"/><rect x="179" y="25" width="175" height="63" rx="4" fill="#f8fafc" stroke="'+accent+'" stroke-width="4"/><path d="M197 47h68m-68 14h105m-105 14h43" stroke="'+accent+'" stroke-width="4" opacity=".6"/><rect x="424" y="47" width="36" height="67" rx="3" fill="#fafcfd"/><path d="M434 104V62m7 42V72m8 32V66" stroke="'+accent+'" stroke-width="4"/>' +
      (hall ? '<path d="M130 106h258v15H130z" fill="'+accent+'"/>' : '') + desks + '<path d="M40 189h420" stroke="#acb9c8" stroke-width="2"/></svg>';
  }
  function visual(room, compact = false) {
    const photo=photos.get(room.id);
    return '<figure class="room-visual'+(compact?' compact':'')+'" data-room-visual="'+esc(room.id)+'">'+(photo ? '<img src="'+photo+'" alt="Foto adicionada de '+esc(room.name)+'" loading="lazy">' : illustration(room)) + '<figcaption>'+ (photo?'Foto adicionada':'Imagem ilustrativa')+'</figcaption><span class="room-type-label">'+esc(room.type)+'</span></figure>';
  }
  function controls(room) {
    if (!mayEdit(room)) return '';
    return '<div class="room-photo-controls" data-room-photo-controls="'+esc(room.id)+'"><button type="button" class="text-button" data-room-photo="'+esc(room.id)+'">'+icon('file')+(photos.has(room.id)?'Trocar foto':'Adicionar foto')+'</button>'+(photos.has(room.id)?'<button type="button" class="text-button" data-room-photo-remove="'+esc(room.id)+'">Remover foto</button>':'')+'</div>';
  }
  function refresh(room) {
    const modal = document.getElementById('app-dialog');
    const scope = modal?.open ? modal : document;
    for (const el of document.querySelectorAll('[data-room-visual]')) if (el.dataset.roomVisual===room.id) el.outerHTML=visual(room,el.classList.contains('compact'));
    for (const el of document.querySelectorAll('[data-room-photo-controls]')) if (el.dataset.roomPhotoControls===room.id) el.outerHTML=controls(room);
    [...scope.querySelectorAll('[data-room-photo]')].find((el)=>el.dataset.roomPhoto===room.id)?.focus({preventScroll:true});
  }
  document.addEventListener('click', (event)=> {
    const add=event.target.closest?.('[data-room-photo]'), remove=event.target.closest?.('[data-room-photo-remove]');
    if (!add && !remove) return;
    const room=S.data.rooms.find((r)=>r.id===(add?.dataset.roomPhoto || remove?.dataset.roomPhotoRemove));
    if (!mayEdit(room)) return;
    if (remove) { photos.delete(room.id); refresh(room); S.toast('Foto removida. A ilustração voltou a ser exibida.'); return; }
    const originalRole=S.state.role;
    const picker=document.createElement('input'); picker.type='file'; picker.accept='image/jpeg,image/png,image/webp';
    picker.addEventListener('change',()=> {
      const file=picker.files?.[0]; if (!file) return;
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>3*1024*1024) { S.toast('Escolha uma imagem JPG, PNG ou WebP de até 3 MB.'); return; }
      const reader=new FileReader();
      reader.onerror=()=>S.toast('Não foi possível ler essa imagem. Tente outro arquivo.');
      reader.onload=()=> {
        const src=String(reader.result);
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(src)) { S.toast('Formato de imagem inválido.'); return; }
        const image=new Image();
        image.onerror=()=>S.toast('O arquivo não é uma imagem válida.');
        image.onload=()=> {
          if (!mayEdit(room) || S.state.role!==originalRole) return;
          if (!image.naturalWidth || image.naturalWidth*image.naturalHeight>24000000) { S.toast('Escolha uma imagem com até 24 megapixels.'); return; }
          photos.set(room.id,src); refresh(room); S.toast('Foto adicionada nesta sessão. Ao recarregar a página, ela será removida.');
        };
        image.src=src;
      };
      reader.readAsDataURL(file);
    });
    picker.click();
  });
  S.RoomMedia={visual,controls};
})();
