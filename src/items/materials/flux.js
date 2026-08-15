const FLUX_GRADES = [
    { grade: 1, name: 'Flux I', icon: 'icons/flux_i.png', sellValue: 35 },
    { grade: 2, name: 'Flux II', icon: 'icons/flux_ii.png', sellValue: 80 },
    { grade: 3, name: 'Flux III', icon: 'icons/flux_iii.png', sellValue: 180 },
    { grade: 4, name: 'Flux IV', icon: 'icons/flux_iv.png', sellValue: 420 },
    { grade: 5, name: 'Flux V', icon: 'icons/flux_v.png', sellValue: 950 }
];

export default FLUX_GRADES.map(({ grade, name, icon, sellValue }) => ({
    name,
    type: 'Material',
    resourceType: 'Flux',
    fluxGrade: grade,
    icon,
    slot: 'material',
    stackable: true,
    quantity: 1,
    sellValue,
    isDisassembleable: false
}));
