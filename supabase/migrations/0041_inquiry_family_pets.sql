-- 상담 신청 폼에 가족구성원/반려동물 항목 추가
alter table inquiries add column family_members text;
alter table inquiries add column pets text[];
