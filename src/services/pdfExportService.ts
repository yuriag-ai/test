// PDF Export Service
import jsPDF from 'jspdf';
import type { Workout, Exercise } from '../types';

export class PDFExportService {
  static async exportWorkoutToPDF(
    workout: Workout,
    exercises: Exercise[],
    userNa me: string
  ): Promise<void> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPos = 20;

    // Header with logo
    pdf.setFillColor(255, 107, 53); // Orange
    pdf.rect(0, 0, pageWidth, 30, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TreinaÍ', 15, 20);

    // Workout name
    yPos = 45;
    pdf.setTextColor(26, 26, 46); // Navy
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(workout.name || 'Meu Treino', 15, yPos);

    // Workout info
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(102, 102, 102);
    pdf.text(`Criado para: ${userName}`, 15, yPos);

    yPos += 5;
    pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 15, yPos);

    yPos += 5;
    pdf.text(`Objetivo: ${workout.goal} | Nível: ${workout.level} | Duração: ${workout.duration_minutes} min`, 15, yPos);

    // Summary box
    yPos += 10;
    pdf.setFillColor(255, 249, 247);
    pdf.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');

    pdf.setFontSize(9);
    pdf.setTextColor(26, 26, 46);
    yPos += 8;
    pdf.text(`📊 Resumo do Treino`, 20, yPos);
    yPos += 6;
    pdf.text(`${exercises.length} exercícios | ${workout.duration_minutes} min | ~${workout.duration_minutes * 5} calorias`, 20, yPos);

    // Exercises
    yPos += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(26, 26, 46);
    pdf.text('Exercícios', 15, yPos);

    exercises.forEach((exercise, index) => {
      yPos += 12;

      // Check if we need a new page
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 20;
      }

      // Exercise number
      pdf.setFillColor(255, 107, 53);
      pdf.circle(20, yPos - 2, 4, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text(String(index + 1), 19, yPos + 1);

      // Exercise name
      pdf.setTextColor(26, 26, 46);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(exercise.exercise_name || '', 30, yPos);

      // Exercise details
      yPos += 6;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(102, 102, 102);

      const details = [];
      if (exercise.sets) details.push(`${exercise.sets} séries`);
      if (exercise.reps) details.push(`${exercise.reps} repetições`);
      if (exercise.duration_seconds) details.push(`${exercise.duration_seconds}s`);
      if (exercise.rest_seconds) details.push(`${exercise.rest_seconds}s descanso`);

      pdf.text(details.join(' • '), 30, yPos);

      // Muscle groups
      if (exercise.muscle_groups && exercise.muscle_groups.length > 0) {
        yPos += 5;
        pdf.setFontSize(8);
        pdf.setTextColor(102, 102, 102);
        pdf.text(`Músculos: ${exercise.muscle_groups.join(', ')}`, 30, yPos);
      }

      // Instructions
      if (exercise.instructions) {
        yPos += 5;
        pdf.setFontSize(9);
        pdf.setTextColor(45, 45, 45);
        const instructions = pdf.splitTextToSize(exercise.instructions, pageWidth - 45);
        pdf.text(instructions, 30, yPos);
        yPos += instructions.length * 4;
      }

      // Beginner tip
      if (exercise.beginner_tip) {
        yPos += 5;
        pdf.setFillColor(22, 219, 147, 0.1);
        const tipHeight = 15;
        pdf.roundedRect(30, yPos - 4, pageWidth - 45, tipHeight, 2, 2, 'F');

        pdf.setFontSize(8);
        pdf.setTextColor(18, 181, 119);
        pdf.setFont('helvetica', 'bold');
        pdf.text('💡 DICA PARA INICIANTES', 33, yPos);

        yPos += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(45, 45, 45);
        const tip = pdf.splitTextToSize(exercise.beginner_tip, pageWidth - 55);
        pdf.text(tip, 33, yPos);
        yPos += tip.length * 4 + 2;
      }

      yPos += 3;
    });

    // Footer
    const footerY = pageHeight - 15;
    pdf.setFillColor(26, 26, 46);
    pdf.rect(0, footerY, pageWidth, 15, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('TreinaÍ - Seu treino. Sua inteligência. | www.treinai.com', pageWidth / 2, footerY + 10, { align: 'center' });

    // Save PDF
    const fileName = `treino-${workout.name?.toLowerCase().replace(/\s+/g, '-')}-${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  }
}
