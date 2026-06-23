/* ════════════════════════════════════════
   PACHETE FORMULAR COMANDĂ
   Folosit în admin.js + script.js
   ════════════════════════════════════════ */

const FORM_PACKAGES = {
  nunta: {
    label: 'Invitații Nuntă',
    icon:  '💍',
    sections: [
      {
        title: '👰 Familia',
        fields: [
          { id: 'numeMireasa',    label: 'Nume mireasă',              type: 'text', required: true,  placeholder: 'ex: Maria' },
          { id: 'numeMire',       label: 'Nume mire',                 type: 'text', required: true,  placeholder: 'ex: Ion' },
          { id: 'numeNasMare',    label: 'Nume nănaș mare',           type: 'text', required: false, placeholder: 'ex: Gheorghe' },
          { id: 'numeNasaMare',   label: 'Nume nănașă mare',          type: 'text', required: false, placeholder: 'ex: Elena' },
          { id: 'numeSoacraMare', label: 'Soacră mare (mama miresei)', type: 'text', required: false, placeholder: 'ex: Ana' },
          { id: 'numeSocruMare',  label: 'Socru mare (tata miresei)', type: 'text', required: false, placeholder: 'ex: Vasile' },
          { id: 'numeSoacraMica', label: 'Soacră mică (mama mirelui)', type: 'text', required: false, placeholder: 'ex: Maria' },
          { id: 'numeSocruMic',   label: 'Socru mic (tata mirelui)',  type: 'text', required: false, placeholder: 'ex: Petre' },
        ]
      },
      {
        title: '📍 Detalii Eveniment',
        fields: [
          { id: 'dataEveniment',        label: 'Data evenimentului',         type: 'date', required: true },
          { id: 'dataLimitaConfirmari', label: 'Data limită confirmări',     type: 'date', required: true },
          { id: 'locatieCununie',       label: 'Locație cununie religioasă', type: 'text', required: false, placeholder: 'ex: Biserica Sf. Nicolae' },
          { id: 'oraCununie',           label: 'Ora cununie religioasă',     type: 'time', required: false },
          { id: 'locatiePetrecere',     label: 'Locație petrecere',          type: 'text', required: false, placeholder: 'ex: Restaurant Eden' },
          { id: 'oraPetrecere',         label: 'Ora petrecere',              type: 'time', required: false },
          { id: 'oraValsulMirilor',     label: 'Ora valsul mirilor',         type: 'time', required: false, fullWidth: true },
        ]
      },
      {
        title: '📞 Confirmări',
        fields: [
          { id: 'telefoane', label: 'Numere de telefon pentru confirmări', type: 'text', required: true, fullWidth: true, placeholder: 'ex: 0712 345 678, 0723 456 789' },
        ]
      }
    ]
  },

  botez: {
    label: 'Invitații Botez',
    icon:  '👶',
    sections: [
      {
        title: '👶 Familie',
        fields: [
          { id: 'numeleCopilului', label: 'Numele copilului',  type: 'text', required: true,  placeholder: 'ex: Alexandru' },
          { id: 'dataEveniment',   label: 'Data evenimentului', type: 'date', required: true },
          { id: 'numeNasi',        label: 'Numele nașilor',     type: 'text', required: false, placeholder: 'ex: Ion și Maria Popescu' },
          { id: 'numeParinti',     label: 'Numele părinților',  type: 'text', required: false, placeholder: 'ex: Andrei și Elena Ionescu' },
        ]
      },
      {
        title: '📍 Detalii Eveniment',
        fields: [
          { id: 'locatieSfBotez',   label: 'Locație Taina Sf. Botez',  type: 'text', required: false, placeholder: 'ex: Biserica Sf. Spiridon' },
          { id: 'oraSfBotez',       label: 'Ora Taina Sf. Botez',      type: 'time', required: false },
          { id: 'locatiePetrecere', label: 'Locație petrecere',         type: 'text', required: false, placeholder: 'ex: Restaurant Eden' },
          { id: 'oraPetrecere',     label: 'Ora petrecere',             type: 'time', required: false },
        ]
      },
      {
        title: '📞 Confirmări',
        fields: [
          { id: 'dataLimitaConfirmari', label: 'Data limită confirmări',      type: 'date', required: true },
          { id: 'telefoane',            label: 'Număr de telefon confirmări', type: 'tel',  required: true, placeholder: 'ex: 0712 345 678' },
        ]
      }
    ]
  },

  simplu: {
    label: 'Simplu',
    icon:  '📋',
    sections: [
      {
        title: '📋 Detalii',
        fields: [
          { id: 'numePrenume',            label: 'Nume și prenume',        type: 'text',     required: true,  fullWidth: true, placeholder: 'Numele complet' },
          { id: 'informatiiSuplimentare', label: 'Informații suplimentare', type: 'textarea', required: false, fullWidth: true, placeholder: 'Orice detalii relevante pentru comandă...' },
        ]
      }
    ]
  },

  none: {
    label: 'Fără formular',
    icon:  '—',
    sections: []
  }
};

const CAT_DEFAULT_PKG = { nunta: 'nunta', botez: 'botez', plic: 'simplu' };
function getCatDefaultPkg(catId) { return CAT_DEFAULT_PKG[catId] || 'simplu'; }
