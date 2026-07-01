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
          { id: 'numeMireasa',   label: 'Nume mireasa',  type: 'text', required: true,  placeholder: 'ex: Maria' },
          { id: 'numeMire',      label: 'Nume mire',     type: 'text', required: true,  placeholder: 'ex: Ion' },
          { id: 'numeNasi',      label: 'Nume nasi',     type: 'text', required: false, placeholder: 'ex: Gheorghe si Elena' },
          { id: 'numeSocriiMari', label: 'Socrii mari',  type: 'text', required: false, placeholder: 'ex: Ana si Vasile' },
          { id: 'numeSocriiMici', label: 'Socrii mici',  type: 'text', required: false, placeholder: 'ex: Maria si Petre' },
        ]
      },
      {
        title: '📍 Detalii Eveniment',
        fields: [
          { id: 'dataEveniment',        label: 'Data evenimentului',         type: 'date', required: true },
          { id: 'dataLimitaConfirmari', label: 'Data limita confirmari',     type: 'date', required: true },
          { id: 'locatieCununie',       label: 'Locatie cununie religioasa', type: 'text', required: false, placeholder: 'ex: Biserica Sf. Nicolae' },
          { id: 'oraCununie',           label: 'Ora cununie religioasa',     type: 'time', required: false },
          { id: 'locatiePetrecere',     label: 'Locatie petrecere',          type: 'text', required: false, placeholder: 'ex: Restaurant Eden' },
          { id: 'oraPetrecere',         label: 'Ora petrecere',              type: 'time', required: false },
          { id: 'oraValsulMirilor',     label: 'Ora valsul mirilor',         type: 'time', required: false, fullWidth: true },
        ]
      },
      {
        title: '📞 Confirmări',
        fields: [
          { id: 'telefoane', label: 'Numere de telefon pentru confirmari', type: 'text', required: true, fullWidth: true, placeholder: 'ex: 0712 345 678, 0723 456 789' },
          { id: 'numarTelefon', label: 'Numar de telefon pentru confirmarea comenzii', type: 'tel', required: true, fullWidth: true, placeholder: 'ex: 0712 345 678' },
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
          { id: 'numeleCopilului', label: 'Numele copilului',   type: 'text', required: true,  placeholder: 'ex: Alexandru' },
          { id: 'dataEveniment',   label: 'Data evenimentului', type: 'date', required: true },
          { id: 'numeNasi',        label: 'Numele nasilor',     type: 'text', required: false, placeholder: 'ex: Ion și Maria Popescu' },
          { id: 'numeParinti',     label: 'Numele parintilor',  type: 'text', required: false, placeholder: 'ex: Andrei și Elena Ionescu' },
        ]
      },
      {
        title: '📍 Detalii Eveniment',
        fields: [
          { id: 'locatieSfBotez',   label: 'Locatie Taina Sf. Botez', type: 'text', required: false, placeholder: 'ex: Biserica Sf. Spiridon' },
          { id: 'oraSfBotez',       label: 'Ora Taina Sf. Botez',     type: 'time', required: false },
          { id: 'locatiePetrecere', label: 'Locatie petrecere',        type: 'text', required: false, placeholder: 'ex: Restaurant Eden' },
          { id: 'oraPetrecere',     label: 'Ora petrecere',            type: 'time', required: false },
        ]
      },
      {
        title: '📞 Confirmări',
        fields: [
          { id: 'dataLimitaConfirmari', label: 'Data limita confirmari',    type: 'date', required: true },
          { id: 'telefoane',            label: 'Numar de telefon confirmari', type: 'tel', required: true, placeholder: 'ex: 0712 345 678' },
          { id: 'numarTelefon', label: 'Numar de telefon pentru confirmarea comenzii', type: 'tel', required: true, fullWidth: true, placeholder: 'ex: 0712 345 678' },
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
          { id: 'numePrenume',            label: 'Nume si prenume',         type: 'text',     required: true,  fullWidth: true, placeholder: 'Numele complet' },
          { id: 'numarTelefon',           label: 'Numar de telefon pentru confirmarea comenzii', type: 'tel', required: true, fullWidth: true, placeholder: 'ex: 0712 345 678' },
          { id: 'informatiiSuplimentare', label: 'Informatii suplimentare', type: 'textarea', required: false, fullWidth: true, placeholder: 'Orice detalii relevante pentru comandă...' },
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
